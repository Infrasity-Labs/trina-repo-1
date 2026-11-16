# Which hosts can run this

This repo starts the **official Trina AX Docker kit** (v0.5.9). Trina AX isolates every AI turn with a sandbox (bubblewrap + Landlock + seccomp) and an nftables rule, so the Docker host's Linux kernel matters. Requirements, from the product's own Docker guide: cgroup v2, Landlock, nftables, unprivileged user namespaces (kernel 6.12+ recommended), `kernel.yama.ptrace_scope=1` on the host, 4 GB RAM for the container. On Ubuntu 24.04 hosts also `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0`.

`node scripts/demo.mjs up` stops early with a specific message when the container says it cannot start.

## What was actually run

| Host | Result | Date |
|---|---|---|
| Windows 11, Docker Desktop 29.7.2 on WSL2 (kernel 5.15.167.4-microsoft-standard-WSL2, cgroup v1, empty LSM list) | **Does not start.** Installer stops with `install: cgroup v2 (unified) is required; /sys/fs/cgroup is tmpfs`, the container restart-loops. The kernel also lists no Landlock. | 2026-11-16 |
| Linux server (Debian 12/13, Ubuntu 24.04 with the sysctl above), OrbStack on a Mac | Listed as working by the Trina AX Docker guide. **Not run for this repo.** | not run |

Nothing else was tried. Add a row (with date and Trina AX version) when you run it somewhere.

## If your machine is Windows or a Mac

Use a small Linux VM or a cheap cloud VM (Debian 13 or Ubuntu 24.04, 4 GB RAM), install Docker there, clone this repo there and reach the app with an SSH tunnel: `ssh -L 47830:127.0.0.1:47830 <server>`, then open `http://127.0.0.1:47830`. The server listens on the VM's loopback only.

## Without the sandbox

The seed and `verify` scripts only call the server's HTTP API, so they work against any Trina AX server you can reach, including one started from source in development mode (no OS isolation; see the product's quick start):

```sh
node scripts/demo.mjs seed   --base http://127.0.0.1:19761 --setup-token <code from <data>/setup-token>
node scripts/demo.mjs verify --base http://127.0.0.1:19761
```
