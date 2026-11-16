// Executable form of the access matrix in README.md: signs in as each person and checks what they can and cannot open,
// what their folder listings show, and which team skills they can use. No AI involved.
import fs from 'node:fs'
import path from 'node:path'
import { ApiError } from './api.mjs'
import { FILES_DIR } from './config.mjs'

/** Names of the skills the repo seeds: every folder under company/files/skills that holds a SKILL.md. */
export function seededSkillNames(filesDir = FILES_DIR) {
  const out = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue
      const abs = path.join(dir, e.name)
      if (fs.existsSync(path.join(abs, 'SKILL.md'))) out.push(e.name)
      else walk(abs)
    }
  }
  walk(path.join(filesDir, 'skills'))
  return out.sort()
}

const answer = (e) => (e instanceof ApiError ? `${e.status} ${e.code}` : String(e))

export async function verifyCompany({ api, company, password, ownerPassword, log = () => {} }) {
  const failures = []
  const rows = []
  const fail = (who, msg) => failures.push(`${who}: ${msg}`)
  const allSkills = seededSkillNames()

  for (const c of company.checks) {
    const login = await api.login(c.username, password).catch((e) => {
      fail(c.username, `cannot sign in (${answer(e)})`)
      return null
    })
    if (!login) continue
    const me = api.withToken(login.token)
    // what a path that does not exist at all answers: a closed path must answer exactly the same
    const missing = await me.content('shared/__no-such-file__.md').then(() => 'opened', answer)

    for (const p of c.opens ?? []) {
      try {
        const r = await me.content(p)
        const ok = typeof r.content === 'string' && r.content.length > 0
        rows.push([c.username, p, ok ? 'opens' : 'EMPTY'])
        if (!ok) fail(c.username, `${p} opened but is empty`)
      } catch (e) {
        rows.push([c.username, p, `DENIED (${answer(e)})`])
        fail(c.username, `should open ${p}, got ${answer(e)}`)
      }
    }
    for (const p of c.closed ?? []) {
      const got = await me.content(p).then(() => 'opened', answer)
      rows.push([c.username, p, got === 'opened' ? 'OPENS' : `closed (${got})`])
      if (got === 'opened') fail(c.username, `${p} should be closed but opened`)
      else if (got !== missing) fail(c.username, `${p} answers "${got}", a missing file answers "${missing}": closed folders must look like missing ones`)
    }
    for (const h of c.hiddenInTree ?? []) {
      const t = await me.tree(h.path).catch((e) => ({ entries: [], error: answer(e) }))
      const names = t.entries.map((x) => x.name)
      for (const n of h.names) {
        rows.push([c.username, `${h.path}/ lists ${n}`, names.includes(n) ? 'LISTED' : 'not listed'])
        if (names.includes(n)) fail(c.username, `${h.path}/ lists "${n}"`)
      }
    }
    for (const [list, want] of [['writable', 'write'], ['readOnly', 'read']]) {
      for (const p of c[list] ?? []) {
        const t = await me.tree(p).catch((e) => ({ access: answer(e) }))
        rows.push([c.username, `${p} access`, t.access])
        if (t.access !== want) fail(c.username, `${p} should be ${want}, is ${t.access}`)
      }
    }
    if (c.skills) {
      const names = new Set((await me.skills()).items.map((s) => s.name))
      for (const s of allSkills) {
        const should = c.skills.includes(s)
        rows.push([c.username, `skill ${s}`, names.has(s) ? 'usable' : 'not listed'])
        if (should !== names.has(s)) fail(c.username, should ? `skill ${s} is missing` : `skill ${s} should not be listed`)
      }
    }
    await me.logout().catch(() => {})
  }

  // the owner: every seeded skill loads without warnings
  const o = await api.login(company.owner.username, ownerPassword).catch(() => null)
  if (o) {
    const me = api.withToken(o.token)
    const issues = (await me.skillIssues()).items ?? []
    rows.push([company.owner.username, 'skill load warnings', String(issues.length)])
    if (issues.length) fail(company.owner.username, `${issues.length} skill(s) do not load: ${JSON.stringify(issues)}`)
    await me.logout().catch(() => {})
  } else fail(company.owner.username, 'cannot sign in to check skill warnings')

  for (const [who, what, result] of rows) log(`${who.padEnd(16)} ${what.padEnd(62)} ${result}`)
  return { ok: failures.length === 0, failures, rows }
}
