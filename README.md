# Trina AX: team & permissions

A sample company for a self-hosted [Trina AX](https://github.com/trina-app/trina-ax) server. Shared company files (price list, past quotes), team folders with per-person permissions (finance files only for Finance) and two team skills.

**What it shows:** a new teammate asks for a quote and gets one built from the company price list. A marketing user cannot see the Finance folder, and neither can their AI.

> Every person, customer, price and document here is fictional. `pinewharf.example` is a reserved example domain. Not endorsed by Anthropic or OpenAI. Claude is a trademark of Anthropic.

## The company

**Pinewharf Print Co.** prints business cards, roll-up banners and tote bags. Quotes depend on quantity tiers, so an AI answer is easy to check.

| Sign in as | Who | Group | Can open |
|---|---|---|---|
| `nina` | New teammate, first day | Sales | company files, Sales folder |
| `sam` | Sales lead | Sales | the same, and edits the price list |
| `maya` | Marketing lead | Marketing | company files, Marketing folder |
| `felix` | Finance lead | Finance | company files, Finance folder, Finance skill |
| `pinewharf-admin` | Owner | none | everything |

Members' password: `pinewharf-demo-1` (public, fictional). The owner's password is random and saved in `.demo/owner-password`.

### Who can open what

`R` read, `W` write, `-` not visible (answers like a missing path).

| Path | Nina | Sam | Maya | Felix |
|---|---|---|---|---|
| `shared/handbook/` | R | R | R | R |
| `shared/pricing/` (price list, discount policy) | R | **W** | R | R |
| `shared/quotes/` (past quotes) | **W** | **W** | R | R |
| `groups/Sales/` | W | W | - | - |
| `groups/Marketing/` | - | - | W | - |
| `groups/Finance/` (supplier costs, margins, budget) | - | - | - | W |
| skill `quote-from-price-list` | use | use | use | use |
| skill `margin-check` (`skills/finance/`) | - | - | - | use |

The rules behind it are in [`company/company.json`](company/company.json). Trina AX's default is that everyone can *write* `shared/`; this repo replaces that with read-only and adds write for Sam on `pricing` and for Sales on `quotes`.

## Run it

Needs [Docker](https://docs.docker.com/get-docker/) on a host the Trina AX Docker kit supports, Node 20+ and git. **Read [docs/hosts.md](docs/hosts.md) first:** the Trina AX sandbox needs a Linux kernel with cgroup v2 and Landlock. Docker Desktop on Windows (WSL2, default kernel) does not meet that, and `up` stops with a message saying so.

```sh
git clone <this repo> && cd trina-ax-team-permissions
node scripts/demo.mjs up        # fetches the official kit (v0.5.9), starts the server, seeds the company, checks it
```

Then open `http://127.0.0.1:47830` (use `127.0.0.1`, not `localhost`) and sign in as any person above. Files, permissions and skills work now, with no AI account.

The first start builds an image and downloads Trina AX's AI engine (about 300 MB), whether or not you use AI. No timings are claimed yet: none were measured on a supported host.

### Make the AI answer (your own Claude account)

```sh
claude setup-token                              # prints a token
node scripts/demo.mjs ai-token < token.txt      # hands it to the server
```

AI usage is billed to the account you connect, and the context a request needs goes to Anthropic. This software setting does not grant permission under Anthropic's terms: use an account and plan authorized for it.

Sign in as `nina` and send:

```
/quote-from-price-list Harbor Dental wants 500 double-sided business cards and 2 roll-up banners. Can you quote it?
```

Expected: cards 500 × $0.22 = $110.00, banners 2 × $89.00 = $178.00, subtotal $288.00, no discount, shipping $15.00, total **$303.00**, quote number Q-2026-0048, and a note that Harbor Dental's earlier order was 250 cards at $0.30. It is a draft: a person reads it before it goes out. AI answers vary; check the sources it shows.

Then sign in as `maya` and ask `What is our margin on business cards? Check the Finance files if you need to.` Her AI cannot open Finance, so it has nothing to answer with.

More: [docs/walkthrough.md](docs/walkthrough.md) (admin screens, changing a rule live).

### Other commands

```sh
node scripts/demo.mjs verify         # who can open what, no AI involved
node scripts/demo.mjs down           # stop, keep the data
node scripts/demo.mjs reset --yes    # delete this demo's container, volume and .demo/ (nothing else)
node scripts/lint-fixtures.mjs       # arithmetic and leak checks on the sample files, no server needed
```

The demo runs as its own Docker Compose project (`pinewharf-trina-ax`) on port 47830, so it does not touch a Trina AX you already run.

## What was tested

- `verify` (48 checks), a second `seed` run (nothing duplicated or changed), and a negative test (granting Maya Finance makes `verify` fail, revoking makes it pass) were run against a real Trina AX 0.5.9 server started from source in development mode.
- The Docker path was run up to the container's installer on Docker Desktop (WSL2), where it stops because that kernel has no cgroup v2 ([docs/hosts.md](docs/hosts.md)). It has **not** been run to a healthy server on a supported host.
- The AI answers (the quote, Maya's margin question) have **not** been run yet. The skills load and are listed for the right people; whether the model reproduces the golden quote is checked by [docs/recording.md](docs/recording.md).

## What this does not show

- Self-hosting is not offline: what a request needs goes to the AI provider you connect.
- Server operators can read stored files and chats. Removing someone's access does not erase answers they already saw.
- Development mode (used for some of the tests above) has no OS-level isolation; the Docker kit does. Do not judge the AI lockout in development mode: the AI there runs as your OS user.
- MCP servers, Google Drive, Slack, rooms, scheduled tasks, projects and guests are not part of this example.
- Trina AX's HTTP API is not a stable public API. The scripts pin v0.5.9 (`scripts/lib/config.mjs`) and `verify` fails loudly if the server behaves differently.

## Make it your own

Everything the seed does comes from [`company/company.json`](company/company.json) (people, groups, folder rules, uploaders, settings, company profile and the checks `verify` runs) and the Markdown under [`company/files/`](company/files/). Change those, run `node scripts/lint-fixtures.mjs`, then `up` on a fresh server. The seed code in `scripts/lib/` has no company-specific names.

## Layout

```
company/company.json     people, groups, rules, checks
company/files/           shared/, groups/, skills/ at their team paths
scripts/demo.mjs         up | seed | verify | ai-token | status | logs | down | reset
scripts/lib/             API client, Docker kit helpers, seed, verify
scripts/lint-fixtures.mjs
docs/                    hosts, walkthrough, recording guide, PRD
docs/PRD.md             the product requirements for this repo
```

## License

MIT for this repo ([LICENSE](LICENSE)). Trina AX is AGPL-3.0-only and is fetched at run time from its own repository, not copied here.
