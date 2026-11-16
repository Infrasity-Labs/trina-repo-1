// Docker plumbing: fetches the official Trina AX docker/ kit at the pinned release and runs docker compose on it.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import { COMPOSE_PROJECT, KIT_DIR, KIT_DOCKER_DIR, SERVICE, TRINA_AX_REPO, TRINA_AX_VERSION } from './config.mjs'

/** Run a command; resolves {code, out}. inherit: show its output live instead of capturing it. */
export function run(cmd, args, { cwd, input, inherit = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: [input !== undefined ? 'pipe' : 'ignore', inherit ? 'inherit' : 'pipe', inherit ? 'inherit' : 'pipe'] })
    let out = ''
    child.stdout?.on('data', (d) => (out += d))
    child.stderr?.on('data', (d) => (out += d))
    child.on('error', (e) => (e.code === 'ENOENT' ? reject(new Error(`"${cmd}" was not found on PATH`)) : reject(e)))
    child.on('close', (code) => resolve({ code, out }))
    if (input !== undefined) child.stdin.end(input)
  })
}

export async function preflight() {
  const major = Number(process.versions.node.split('.')[0])
  if (major < 20) throw new Error(`Node 20 or newer is required (this is ${process.versions.node}).`)
  const git = await run('git', ['--version']).catch(() => null)
  if (!git || git.code !== 0) throw new Error('git is required (it fetches the official Trina AX docker kit).')
  const d = await run('docker', ['info', '--format', '{{.ServerVersion}}']).catch(() => null)
  if (!d) throw new Error('Docker was not found. Install Docker (https://docs.docker.com/get-docker/) and try again.')
  if (d.code !== 0) throw new Error('The Docker daemon is not running. Start Docker Desktop / the docker service and try again.')
  const c = await run('docker', ['compose', 'version'])
  if (c.code !== 0) throw new Error('"docker compose" (Compose v2) is required.')
}

export function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer()
    s.once('error', () => resolve(false))
    s.once('listening', () => s.close(() => resolve(true)))
    s.listen(port, '127.0.0.1')
  })
}

/** Sparse-clone only docker/ of the pinned release tag and write its .env. */
export async function ensureKit({ port }) {
  const tagFile = `${KIT_DIR}/.version`
  const entry = `${KIT_DOCKER_DIR}/entrypoint.sh`
  // CRLF in a shell script makes the container fail with "exec ...: no such file or directory" (git on Windows converts line endings by default)
  const have = fs.existsSync(tagFile) && fs.readFileSync(tagFile, 'utf8').trim() === TRINA_AX_VERSION && fs.existsSync(entry) && !fs.readFileSync(entry, 'utf8').includes('\r')
  if (!have) {
    fs.rmSync(KIT_DIR, { recursive: true, force: true })
    const clone = await run('git', ['clone', '-c', 'core.autocrlf=false', '-c', 'core.eol=lf', '--quiet', '--depth', '1', '--branch', `v${TRINA_AX_VERSION}`, '--filter=blob:none', '--sparse', TRINA_AX_REPO, KIT_DIR])
    if (clone.code !== 0) throw new Error(`Could not fetch the Trina AX kit v${TRINA_AX_VERSION}:\n${clone.out}`)
    const sparse = await run('git', ['sparse-checkout', 'set', 'docker'], { cwd: KIT_DIR })
    if (sparse.code !== 0) throw new Error(`git sparse-checkout failed:\n${sparse.out}`)
    fs.writeFileSync(tagFile, TRINA_AX_VERSION + '\n')
  }
  fs.writeFileSync(
    `${KIT_DOCKER_DIR}/.env`,
    [
      '# written by scripts/demo.mjs; do not edit (regenerated on every "up")',
      `TRINA_AX_VERSION=${TRINA_AX_VERSION}`,
      'TRINA_AX_ENGINES=claude',
      'TRINA_AX_BIND=127.0.0.1',
      `TRINA_AX_PORT=${port}`,
      'TRINA_AX_TIMEZONE=America/New_York',
      'TRINA_AX_MEMORY=4g',
      'TRINA_AX_CPUS=2',
      '',
    ].join('\n'),
  )
}

/** docker compose in the kit folder (the product's compose file reads ./seccomp.json relative to it). */
export function compose(args, opts = {}) {
  return run('docker', ['compose', '-p', COMPOSE_PROJECT, ...args], { cwd: KIT_DOCKER_DIR, ...opts })
}

export const exec = (args, opts = {}) => compose(['exec', '-T', SERVICE, ...args], opts)

// Messages the product's installer/entrypoint prints when the Docker host cannot run it. The container restarts and
// prints them again, so they are a reliable "this will never become healthy" signal.
const KNOWN_STOPS = [
  [/cgroup v2 \(unified\) is required/, 'The Docker host uses cgroup v1, but Trina AX needs cgroup v2 (the product\'s Docker guide lists the host requirements). Docker Desktop on Windows/WSL2 with the default kernel is not enough: see docs/hosts.md.'],
  [/engine sandbox \(bubblewrap\) cannot start here/, 'The engine sandbox (bubblewrap) cannot start on this Docker host. On Ubuntu 24.04 hosts run: sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0 (see docs/hosts.md).'],
  [/nftables does not work here/, 'The container cannot use nftables (the NET_ADMIN capability or kernel support is missing).'],
  [/has no setgid bit/, 'The container is missing the FSETID capability; see the product\'s Docker guide.'],
  [/no such file or directory/, 'The container cannot start its entrypoint (usually Windows line endings in the kit scripts: delete .trina-ax-kit/ and run again).'],
  [/^install: .*(is required|not supported|cannot)/m, 'The installer inside the container refuses this host (see the log line below and docs/hosts.md).'],
]

/** Wait for /api/health; fail early with a specific reason when the container says it cannot start. */
export async function waitHealthy({ base, timeoutMs = 20 * 60 * 1000, log }) {
  const start = Date.now()
  let lastLog = 0
  for (;;) {
    try {
      const r = await fetch(`${base}/api/health`)
      if (r.ok) return Math.round((Date.now() - start) / 1000)
    } catch {}
    const elapsed = Date.now() - start
    if (elapsed > timeoutMs) throw new Error('Timed out waiting for Trina AX. See: node scripts/demo.mjs logs')
    if (elapsed - lastLog > 20_000) {
      lastLog = elapsed
      const logs = (await compose(['logs', '--tail', '60', SERVICE])).out
      for (const [re, msg] of KNOWN_STOPS) {
        if (re.test(logs)) throw new Error(msg + '\n\nLast log lines:\n' + logs.trim().split('\n').slice(-6).join('\n'))
      }
      log?.(`still starting (${Math.round(elapsed / 1000)} s; the first start downloads the AI engine, about 300 MB)`)
    }
    await new Promise((r) => setTimeout(r, 3000))
  }
}
