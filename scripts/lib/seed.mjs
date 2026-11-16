// Seeds a Trina AX team from company/company.json and company/files/ through the public HTTP API, in the order the
// product's own demo seeder (scripts/demo/seed.ts in trina-ax) uses: team and owner, groups, people, folder rules,
// files, settings, company profile. Safe to run again: what exists is kept, only what is missing is added.
import fs from 'node:fs'
import path from 'node:path'
import { ApiError } from './api.mjs'

const conflict = (e) => e instanceof ApiError && (e.status === 409 || e.code === 'conflict')

export class SeedError extends Error {}

/** Files under dir as team-relative paths with "/" separators, sorted. */
export function listFiles(dir) {
  const out = []
  const walk = (abs, rel) => {
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue
      const r = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) walk(path.join(abs, e.name), r)
      else if (e.isFile()) out.push({ rel: r, abs: path.join(abs, e.name) })
    }
  }
  walk(dir, '')
  return out.sort((a, b) => (a.rel < b.rel ? -1 : 1))
}

export async function seedCompany({ api, setupToken, company, filesDir, ownerPassword, log = () => {} }) {
  const result = { createdTeam: false, users: [], uploaded: 0, kept: 0 }

  // 1. team and owner
  const status = await api.setupStatus()
  let owner
  if (status.needed) {
    if (!setupToken) throw new SeedError('The team is not set up yet and no setup code was given.')
    await api.setup({
      setupToken,
      teamName: company.teamName,
      locale: company.locale,
      timeZone: company.timeZone,
      owner: { username: company.owner.username, name: company.owner.name, password: ownerPassword },
    })
    result.createdTeam = true
    log(`team "${company.teamName}" created, owner ${company.owner.username}`)
  }
  try {
    const r = await api.login(company.owner.username, ownerPassword)
    if (r.me.user.role !== 'owner') throw new SeedError(`"${company.owner.username}" is not the owner of this team`)
    owner = api.withToken(r.token)
  } catch (e) {
    if (e instanceof SeedError) throw e
    throw new SeedError(
      `This server already has a team and "${company.owner.username}" cannot sign in with the saved owner password. ` +
        `Run "node scripts/demo.mjs reset --yes" to start from an empty server.`,
    )
  }

  // 2. groups
  const groups = new Map((await owner.listGroups()).items.map((g) => [g.name, g]))
  for (const g of company.groups) {
    if (!groups.has(g.name)) {
      groups.set(g.name, await owner.createGroup({ name: g.name, description: g.description, memberIds: [] }))
      log(`group ${g.name} created`)
    }
  }
  const groupId = (name) => {
    const g = groups.get(name)
    if (!g) throw new SeedError(`company.json names an unknown group "${name}"`)
    return g.id
  }

  // 3. people: created with a temporary password, which each person then replaces with the demo password
  const users = new Map((await owner.listUsers()).items.map((u) => [u.username, u]))
  const tokens = new Map()
  for (const p of company.people) {
    const groupIds = p.group ? [groupId(p.group)] : []
    let user = users.get(p.username)
    if (!user) {
      const made = await owner.createUser({ username: p.username, name: p.name, role: 'member', groupIds, locale: company.locale })
      const temp = await api.login(p.username, made.temporaryPassword)
      await api.withToken(temp.token).changePassword(made.temporaryPassword, company.memberPassword)
      tokens.set(p.username, temp.token)
      user = made.user
      users.set(p.username, user)
      log(`member ${p.username} created`)
    } else {
      const missing = groupIds.filter((id) => !(user.groupIds ?? []).includes(id))
      if (missing.length) await owner.updateUser(user.id, { groupIds: [...(user.groupIds ?? []), ...missing] })
      try {
        tokens.set(p.username, (await api.login(p.username, company.memberPassword)).token)
      } catch {
        log(`${p.username} exists with another password; their files are uploaded by the owner`)
      }
    }
    result.users.push(p.username)
  }

  // 4. folder rules
  const ruleOf = (r) => {
    if (r.group) return { subjectType: 'group', subjectId: groupId(r.group), access: r.access }
    if (r.user) {
      const u = users.get(r.user)
      if (!u) throw new SeedError(`company.json names an unknown person "${r.user}"`)
      return { subjectType: 'user', subjectId: u.id, access: r.access }
    }
    return { subjectType: 'everyone', subjectId: null, access: r.access }
  }
  const sameSubject = (a, b) => a.subjectType === b.subjectType && (a.subjectId ?? null) === (b.subjectId ?? null)
  const sameRules = (a, b) => a.length === b.length && a.every((x) => b.some((y) => sameSubject(x, y) && x.access === y.access))
  const strip = (r) => ({ subjectType: r.subjectType, subjectId: r.subjectId ?? null, access: r.access })
  const folders = new Map((await owner.listFolders()).items.map((f) => [f.path, f]))
  for (const r of company.rules) {
    const want = r.rules.map(ruleOf)
    const limited = !!r.limited
    const f = folders.get(r.path)
    if (!f) {
      const parent = path.posix.dirname(r.path)
      if (parent !== '.') await mkdirs(owner, parent)
      await owner.createFolder({ path: r.path, create: true, rules: want, ...(limited ? { limited: true } : {}) })
    } else if (r.mode === 'set') {
      if (!sameRules(f.rules.map(strip), want) || !!f.limited !== limited) {
        await owner.putFolderRules(f.id, { rules: want, limited, ...(f.rulesHash ? { expectedHash: f.rulesHash } : {}) })
      }
    } else {
      const have = f.rules.map(strip)
      const missing = want.filter((w) => !have.some((x) => sameSubject(x, w)))
      if (missing.length || (limited && !f.limited)) {
        await owner.putFolderRules(f.id, { rules: [...have, ...missing], limited: limited || !!f.limited, ...(f.rulesHash ? { expectedHash: f.rulesHash } : {}) })
      }
    }
    log(`rules on ${r.path}: ${r.why}`)
  }

  // 5. files, as the person who owns them (so version history shows real authors)
  const uploaderOf = (rel) => {
    const hit = company.uploaders.find((u) => rel === u.path || rel.startsWith(u.path + '/'))
    return hit && tokens.has(hit.username) ? hit.username : null
  }
  for (const { rel, abs } of listFiles(filesDir)) {
    const folder = path.posix.dirname(rel)
    const name = path.posix.basename(rel)
    const by = uploaderOf(rel)
    const client = by ? api.withToken(tokens.get(by)) : owner
    await mkdirs(owner, folder)
    try {
      await client.upload(folder, name, fs.readFileSync(abs))
      result.uploaded++
      log(`uploaded ${rel} as ${by ?? company.owner.username}`)
    } catch (e) {
      if (!conflict(e)) throw new SeedError(`upload of ${rel} failed: ${e.message}`)
      result.kept++
    }
  }

  // 6. settings and company profile
  if (company.settings && Object.keys(company.settings).length) await owner.updateSettings(company.settings)
  if (company.profile && !(await owner.getCompanyProfile()).profile) {
    await owner.saveCompanyProfile(company.profile)
    log('company profile saved')
  }

  for (const t of tokens.values()) await api.withToken(t).logout().catch(() => {})
  await owner.logout().catch(() => {})
  return result
}

/** Create every missing folder of `folder` (upload needs an existing target folder). */
async function mkdirs(client, folder) {
  const parts = folder.split('/')
  for (let i = 1; i <= parts.length; i++) {
    try {
      await client.mkdir(parts.slice(0, i).join('/'))
    } catch (e) {
      if (!conflict(e)) throw e
    }
  }
}
