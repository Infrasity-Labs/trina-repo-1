#!/usr/bin/env node
// Pinewharf Print Co.: a sample company for a self-hosted Trina AX server.
//
//   node scripts/demo.mjs up          fetch the Docker kit, start the server, create the team, seed it, verify
//   node scripts/demo.mjs seed        seed (again) a server that is already running
//                                     (--base http://127.0.0.1:19761 --setup-token <code> for a server not started by `up`)
//   node scripts/demo.mjs verify      check who can open what (no AI involved)
//   node scripts/demo.mjs ai-token    connect YOUR Claude account: node scripts/demo.mjs ai-token < token.txt
//   node scripts/demo.mjs status | logs | down | reset --yes
import crypto from 'node:crypto'
import fs from 'node:fs'
import { Api } from './lib/api.mjs'
import { COMPANY_FILE, COMPOSE_PROJECT, DEFAULT_PORT, FILES_DIR, OWNER_PASSWORD_FILE, SERVICE, STATE_DIR, TRINA_AX_VERSION } from './lib/config.mjs'
import { compose, ensureKit, exec, portFree, preflight, run, waitHealthy } from './lib/kit.mjs'
import { seedCompany, SeedError } from './lib/seed.mjs'
import { verifyCompany } from './lib/verify.mjs'

const argv = process.argv.slice(2)
const cmd = argv[0]
const flag = (name) => argv.includes(`--${name}`)
const opt = (name) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : undefined
}
const company = JSON.parse(fs.readFileSync(COMPANY_FILE, 'utf8'))
const port = Number(opt('port') ?? process.env.PINEWHARF_PORT ?? DEFAULT_PORT)
const base = (opt('base') ?? `http://127.0.0.1:${port}`).replace(/\/$/, '')
const log = (s) => console.log(`[demo] ${s}`)

/** The owner's password: random, kept in .demo/ (0600), never committed. */
function ownerPassword({ create = true } = {}) {
  try {
    const p = fs.readFileSync(OWNER_PASSWORD_FILE, 'utf8').trim()
    if (p.length >= 16) return { password: p, created: false }
  } catch {}
  if (!create) return { password: '', created: false }
  fs.mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })
  const password = crypto.randomBytes(18).toString('base64url')
  fs.writeFileSync(OWNER_PASSWORD_FILE, password + '\n', { mode: 0o600 })
  return { password, created: true }
}

async function setupCode() {
  const r = await exec(['trina-ax-setup-link'])
  const m = /token=([^\s]+)/.exec(r.out)
  return m ? m[1] : null // null: setup is already done
}

async function doSeed() {
  const { password, created } = ownerPassword()
  const api = new Api(base)
  const status = await api.setupStatus()
  const result = await seedCompany({
    api,
    setupToken: status.needed ? (opt('setup-token') ?? (await setupCode())) : null,
    company,
    filesDir: FILES_DIR,
    ownerPassword: password,
    log,
  })
  log(`seeded: ${result.uploaded} files uploaded, ${result.kept} already there`)
  return { created, password }
}

async function doVerify(ownerPw) {
  const api = new Api(base)
  const r = await verifyCompany({ api, company, password: company.memberPassword, ownerPassword: ownerPw, log: (s) => console.log('  ' + s) })
  if (r.ok) log(`verify: all ${r.rows.length} checks passed`)
  else {
    console.error(`\n[demo] verify FAILED (${r.failures.length}):`)
    for (const f of r.failures) console.error('  - ' + f)
  }
  return r.ok
}

function summary(ownerPw) {
  const people = company.people.map((p) => `    ${p.username.padEnd(8)} ${p.name} (${p.group}${p.note ? `, ${p.note}` : ''})`).join('\n')
  console.log(`
  ${company.teamName} is ready: ${base}

  Sign in with 127.0.0.1 (not "localhost": the session cookie belongs to one address).
  Members (password ${company.memberPassword}):
${people}
  Owner: ${company.owner.username}   password in ${OWNER_PASSWORD_FILE}${ownerPw ? `\n         ${ownerPw}` : ''}

  Files, permissions and skills work now. To make the AI answer, connect your own Claude account:
    claude setup-token            # prints a token
    node scripts/demo.mjs ai-token < token.txt
  Then sign in as nina and run:  /quote-from-price-list Harbor Dental wants 500 double-sided business cards and 2 roll-up banners. Can you quote it?
`)
}

async function main() {
  switch (cmd) {
    case 'up': {
      await preflight()
      const running = (await compose(['ps', '-q']).catch(() => ({ out: '' }))).out.trim()
      if (!running && !(await portFree(port))) throw new Error(`Port ${port} is in use. Pick another: node scripts/demo.mjs up --port 47831`)
      log(`Trina AX ${TRINA_AX_VERSION}, docker compose project "${COMPOSE_PROJECT}", port ${port}`)
      await ensureKit({ port })
      const t0 = Date.now()
      const up = await compose(['up', '-d', '--build'], { inherit: true })
      if (up.code !== 0) throw new Error('docker compose up failed (output above).')
      const secs = await waitHealthy({ base, log })
      log(`server healthy after ${secs} s`)
      const { created, password } = await doSeed()
      const ok = await doVerify(password)
      log(`total ${Math.round((Date.now() - t0) / 1000)} s`)
      if (!ok) process.exitCode = 1
      else summary(created ? password : null)
      break
    }
    case 'seed': {
      await doSeed()
      break
    }
    case 'verify': {
      const { password } = ownerPassword({ create: false })
      if (!(await doVerify(password))) process.exitCode = 1
      break
    }
    case 'ai-token': {
      const chunks = []
      for await (const c of process.stdin) chunks.push(c)
      const token = Buffer.concat(chunks).toString('utf8').split(/\r?\n/)[0].trim()
      if (!token) throw new Error('Pipe your token in: node scripts/demo.mjs ai-token < token.txt (create one with `claude setup-token`).')
      const r = await exec(['/var/lib/mycel/root/set-claude-token'], { input: token + '\n' })
      console.log(r.out.trim())
      if (r.code !== 0) process.exitCode = 1
      break
    }
    case 'status': {
      await compose(['ps'], { inherit: true })
      const h = await fetch(`${base}/api/health`).then((r) => r.status, () => 'unreachable')
      log(`${base}/api/health: ${h}`)
      break
    }
    case 'logs':
      await compose(['logs', '--tail', '100', SERVICE], { inherit: true })
      break
    case 'down':
      await compose(['down'], { inherit: true })
      log('stopped; the team data is kept (node scripts/demo.mjs up starts it again)')
      break
    case 'reset': {
      // by compose-project label, so it works even when .trina-ax-kit/ is gone, and cannot reach any other install
      const byProject = ['--filter', `label=com.docker.compose.project=${COMPOSE_PROJECT}`]
      const lines = async (args) => (await run('docker', args)).out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      const containers = await lines(['ps', '-aq', ...byProject])
      const volumes = await lines(['volume', 'ls', '-q', ...byProject])
      const networks = await lines(['network', 'ls', '-q', ...byProject])
      console.log(`Compose project "${COMPOSE_PROJECT}": ${containers.length} container(s), volume(s) [${volumes.join(', ') || 'none'}], ${networks.length} network(s), plus .demo/.`)
      console.log('All team data of this demo is deleted. Any other Trina AX install is not touched.')
      if (!flag('yes')) {
        console.log('Run again with --yes to do it.')
        process.exitCode = 1
        break
      }
      if (containers.length) await run('docker', ['rm', '-f', ...containers])
      if (networks.length) await run('docker', ['network', 'rm', ...networks])
      if (volumes.length) await run('docker', ['volume', 'rm', ...volumes])
      fs.rmSync(STATE_DIR, { recursive: true, force: true })
      log('reset done')
      break
    }
    default:
      console.log('usage: node scripts/demo.mjs <up|seed|verify|ai-token|status|logs|down|reset --yes> [--port N]')
      process.exitCode = cmd ? 2 : 0
  }
}

main().catch((e) => {
  console.error(`[demo] ${e instanceof SeedError || e instanceof Error ? e.message : e}`)
  process.exit(1)
})
