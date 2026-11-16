# Contributing

Thanks for helping. This repo is a small, readable example, so changes should keep it that way.

## Ground rules

- **Everything is fictional.** No real people, companies, `.com` domains, customer data or credentials. Use `.example` domains.
- **Finance stays closed.** Cost figures and Finance paths live only under `company/files/groups/Finance/` and `company/files/skills/finance/`. `scripts/lint-fixtures.mjs` enforces this.
- **Numbers must reconcile.** Quotes, the price list, the discount policy and the margin report must agree. The lint recomputes them.
- **No dependencies.** Scripts are plain Node 20+ ES modules with no npm packages.
- **One source of truth.** People, groups, folder rules and checks belong in `company/company.json`, not in code.
- **Say what you ran.** Do not claim a result you did not observe. State the Trina AX version and host for anything you tested.

## Setup

```sh
node scripts/lint-fixtures.mjs     # needs only Node 20+
```

To test against a server, see [docs/hosts.md](docs/hosts.md). Then:

```sh
node scripts/demo.mjs up && node scripts/demo.mjs verify
```

## Pull requests

1. Open an issue first for anything bigger than a typo or a fixture fix.
2. Keep each PR to one subject.
3. If you change who can open what, update `checks` in `company/company.json` and the access table in the README in the same PR.
4. Add or update a row in the tested-host table in `docs/hosts.md` if you ran it somewhere new.
5. Update `CHANGELOG.md`.

## Pinned Trina AX version

The version lives in `scripts/lib/config.mjs`. Bumping it is its own PR: run `up`, `verify` and a second `seed`, and note any API change.

## Reporting security problems

See [SECURITY.md](SECURITY.md).
