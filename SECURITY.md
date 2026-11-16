# Security

## Scope

This repo contains fictional sample data and scripts that talk to a Trina AX server you run yourself. Report here:

- a script that leaks a secret (owner password, Claude token, setup code) to output, logs or files outside `.demo/`
- a script that deletes or changes something outside this demo's own Docker Compose project (`pinewharf-trina-ax`)
- sample content that exposes a real person's or company's data

Vulnerabilities in Trina AX itself belong to the [Trina AX security policy](https://github.com/trina-app/trina-ax/security).

## Reporting

Use GitHub's private vulnerability reporting on this repository (Security tab → Report a vulnerability). Do not open a public issue with secrets in it.

## Known limits by design

- The four member accounts use a public demo password. The server binds to `127.0.0.1` only. Do not expose it to a network.
- The owner password is random, stored in `.demo/owner-password` (mode 0600) and git-ignored.
- Your Claude token is passed to the container once through stdin and is not printed or stored by these scripts.
