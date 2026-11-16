# PRD — Repo 1: "Team & permissions" example company for Trina AX

Status: **v2 (review findings applied)** · Owner: Sid · Product: <https://github.com/trina-app/trina-ax>, pinned to **v0.5.9**

Review log (v1 → v2): independent review against the product source found 3 blockers, 5 major, 8 minor items. All accepted; changes are marked **[R]** below. Summary: (B1) the product's default is `shared/` = everyone *write*, so the access matrix needed an explicit rule reset; (B2) Docker host requirements are stricter than assumed (Landlock, cgroup v2, nftables, userns; Windows Docker Desktop is not on the product's tested list), so a host spike is a gating milestone; (B3) the "loadable by the product's `demo:company`" claim was false (strict schema) and was dropped; M1–M5 seed ordering, setup headers, AI-claim wording, engine download, and `reset` blast radius; plus company profile and team settings were missing.

---

## 1. One-line summary

A clone-and-run sample company ("Pinewharf Print Co.") for a self-hosted Trina AX server: shared company files (price list, past quotes), team folders with per-person permissions (finance files only for Finance), and two team skills — enough to prove, in minutes and with one GIF, the product's core promise: **everyone's AI starts from the company's files and skills, and sees only what that person may open.**

## 2. Why this repo exists

Trina AX's README sells two ideas: *set up once, your whole company gets it*, and *each person sees only what they may open*. The product repo's own demo (`bun run demo`) proves the second with a Korean fixture team, needs Bun + Go + a source build, and has AI switched off. An evaluator cannot answer "what does it look like when I set up my company and a new hire asks for a quote?" without writing the company themselves.

This repo is a **reference company you can copy**: the folder tree, ACL rules, skills and seed script are meant to be read and adapted, not just run.

### Goals

| # | Goal | Measure |
|---|---|---|
| G1 | A reader gets a populated Trina AX team with **≤ 4 commands**; time dominated by the one-off image build. **[R]** Measured, not promised: README states the measured first-run and repeat-run times. | Timed cold run on the tested host, recorded in `docs/timing.md`. |
| G2 | The permission model is *visible*: a Marketing user cannot see (not just cannot open) the Finance folder, in Files **and** through their AI. | `verify` passes; GIF shows both. |
| G3 | "New teammate gets a quote from the company price list" works and is numerically checkable. | Golden quote (§7.1) matches the recorded AI answer. |
| G4 | The repo is a template: everything seeded is declared in one data file plus plain Markdown; seed code has no company-specific strings. | `company/company.json` + `company/files/**`. |
| G5 | Honest about limits (own Claude account needed for AI; self-hosting is not offline; host requirements). | README "What this does not show" + tested-host matrix. |

### Non-goals

MCP servers, Google Drive, Slack, rooms, scheduled tasks, projects, guests, Codex engine, mobile apps, relay/tunnel, backups, production hardening, multi-language UI, recorded AI replay (the product's `demo:company` does that), shipping any model key, modifying Trina AX source. **[R]** Also dropped: any claim that this content loads in the product's `bun run demo:company` (its schema is strict and differs; see §8.1).

## 3. Audience

1. **Evaluator / team lead** (primary): will this work for my 20-person company; new hire productive day 1; finance data safe.
2. **IT/admin** (secondary): wants the exact ACL rules and skill layout to copy.
3. **README/GIF viewers** (tertiary): decide in 30 s whether to click.

## 4. The hero moment (GIF)

~25–30 s, two browser sessions:

1. **Quote.** *Nina* (Sales, first day) types `/quote-from-price-list` and a customer request. The AI reads the price list, discount policy and a past quote for the same customer, and returns a formatted quote with tier prices, shipping rule applied and a quote number. The sources/steps row shows which files it read.
2. **Lockout.** *Maya* (Marketing) opens Files: **no Finance folder** (no greyed entry, no "access denied"). She asks her AI "what's our margin on business cards?" — it cannot find cost data and says so (whatever words the real take produces).

Success: a viewer who never read the README can say what happened and why it matters after one loop.

## 5. What this repo showcases

| Product capability | Showcase | Proof |
|---|---|---|
| Shared company files in `shared/` | `shared/pricing`, `shared/quotes`, `shared/handbook` | `verify` |
| Groups with own folders (`groups/<g>/`) | Sales, Marketing, Finance | `verify`: cross-group paths closed |
| Folder rules: person/group write; `limited` folders | `shared/` reset to everyone-read; `shared/pricing` Sam-write; `shared/quotes` Sales-write; `skills/finance` limited | `verify` (`access` per folder) |
| "Not found" instead of "forbidden" | Marketing's tree has no Finance entry; direct read answers like a missing file | `verify`, GIF beat 2 |
| AI works as the asker | Maya's AI cannot read Finance; Nina's can read pricing | GIF beat 2 (+ manual check in UI: sources row) |
| Team skills | `quote-from-price-list` (whole team) | `verify` skills list; GIF beat 1 |
| Restricted team skills follow folder rules | `skills/finance/margin-check` (Finance only) | `verify` |
| A skill never grants access | Margin skill text names Finance paths, but only Finance can load/read | README prose |
| Company profile (how the AI knows the company) **[R]** | Seeded profile: name, one-liner, products, tone | README mention; owner screen |
| Admin › Folder permissions "what a person can open" view **[R]** | Walkthrough step: pick Maya, see exactly what she can/can't open | walkthrough (UI path verified before writing) |
| Rule changes take effect at once | Walkthrough: owner adds/removes Maya on Finance | manual |

Not demoed on purpose: personal folders, projects, rooms.

## 6. The fictional company: Pinewharf Print Co.

All people, customers, prices and documents are invented. Domain `pinewharf.example` (reserved). Small custom-print shop (business cards, roll-up banners, tote bags): quotes depend on quantity tiers, which makes AI arithmetic verifiable.

### 6.1 People and groups

| Username | Name | Role | Group | Story |
|---|---|---|---|---|
| `pinewharf-admin` | Demo Admin | owner | — | Random password in `.demo/owner-password` (0600). Not a persona; sees everything by role, including `skills/finance`. |
| `nina` | Nina Okafor | member | Sales | New teammate, first day. Beat 1. |
| `sam` | Sam Reyes | member | Sales | Sales lead; edits the price list; approves big discounts. |
| `maya` | Maya Lindqvist | member | Marketing | Beat 2. |
| `felix` | Felix Brandt | member | Finance | Finance lead. |

Members' password is a public fixed demo password (`pinewharf-demo-1`), printed by `up`. Server binds to 127.0.0.1 only.

### 6.2 Access matrix

Default to know **[R]**: Trina's default is `shared/` = **everyone write**, `skills/` = everyone read (admins write). A child rule can only *add* access. So the repo **replaces** the rules on `shared/` with `everyone: read`, then adds write for specific people/groups on subfolders. `R` read, `W` write, `—` not visible (same answer as a missing path).

| Path | Nina | Sam | Maya | Felix | How |
|---|---|---|---|---|---|
| `shared/handbook/…` | R | R | R | R | `shared` rule set to everyone-read; owner writes |
| `shared/pricing/…` | R | **W** | R | R | rule: user `sam` write |
| `shared/quotes/…` | **W** | **W** | R | R | rule: group Sales write |
| `groups/Sales/…` | W | W | — | — | group folder |
| `groups/Marketing/…` | — | — | W | — | group folder |
| `groups/Finance/…` | — | — | — | W | group folder |
| `skills/quote-from-price-list/` | use | use | use | use | default `skills/` read |
| `skills/finance/margin-check/` | — | — | — | use | `skills/finance` **limited** + Finance group read **[R]** ("no access" rules are refused by the API; `limited` is the mechanism) |

Owner and admins see everything. No one has more than the table; `verify` enforces it.

### 6.3 File inventory (hand-written Markdown; numbers reconcile)

```
company/files/
  shared/handbook/    company-overview.md, onboarding-guide.md
  shared/pricing/     price-list-2026.md, discount-policy.md
  shared/quotes/      Q-2026-0044-harbor-dental.md      250 cards @ $0.30 (precedent for beat 1)
                      Q-2026-0045-oakline-cafe.md       totes + setup fee, 5% discount
                      Q-2026-0046-northfield-school.md  12 banners, 5% discount, declined 15% ask
                      Q-2026-0047-pier-9-gym.md         mixed order, free shipping
  groups/Sales/       customer-notes.md, pipeline.md
  groups/Marketing/   brand-voice.md, q4-campaign-plan.md
  groups/Finance/     supplier-costs-2026.md, margin-report-2026-q3q4.md, q4-budget.md
  skills/quote-from-price-list/SKILL.md
  skills/finance/margin-check/SKILL.md
```

Content rules:
- Every quote total and every Finance figure is derivable from price list + policy (+ cost file). `scripts/lint-fixtures.mjs` recomputes them and fails on drift.
- Cost figures appear **only** in `groups/Finance/`. No file outside Finance or `skills/finance/` may name a Finance path or repeat a cost figure (lint). README says nothing numeric about cost. **[R]** (v1 contained a self-contradictory sentence here.)
- Past quotes share one format; the skill must reproduce it.
- The team-wide skill must not name `groups/Finance/…` (skills are readable by all; naming it would leak the folder's existence). It may say generically "never use or state internal costs".

## 7. Scenarios and acceptance criteria

### 7.1 S1 — New teammate gets a quote (beat 1)

Price list: cards (BC-350-DS) 100–249 $0.42 · 250–499 $0.30 · 500–999 $0.22 · 1000+ $0.16; roll-up banner (RU-85200) 1–4 $89 · 5–9 $79 · 10+ $69; tote (TB-COT-1C, min 50, +$45 setup per colour) 50–99 $4.80 · 100–249 $3.90 · 250+ $3.20. Tier price applies to every unit. Discount on subtotal (items + fees): <$500 none, ≥$500 5%, ≥$1,500 8%; >10% asked → needs Sam. Shipping $15 flat if subtotal after discount <$300, else free. 30-day validity. Tax excluded.

Prompt: `/quote-from-price-list Harbor Dental wants 500 double-sided business cards and 2 roll-up banners. Can you quote it?`

Golden: 500 × $0.22 = $110.00; 2 × $89.00 = $178.00; subtotal **$288.00**; no discount; shipping **$15.00**; total **$303.00**; number **Q-2026-0048**; notes Harbor Dental's earlier order (Q-2026-0044) and the tier change. Draft only.

Acceptance:
- AC1.1 *(manual, on the recorded take)* the answer contains the golden lines, subtotal, shipping and total. AI is non-deterministic: the repo checks fixtures and permissions automatically; the answer is checked by a person.
- AC1.2 *(manual, UI sources row; no API relied on)* the files read include the price list, the policy and ≥1 file from `shared/quotes/`; no `groups/Finance/` path appears.
- AC1.3 *(manual, second prompt)* "…and the customer wants 12% off" (policy tops out at 8%, so this is a scripted probe): the skill leaves the discount out and says Sam must approve. **[R]**

### 7.2 S2 — Marketing cannot open Finance (beat 2, non-AI, automated)

- AC2.1 Maya's tree at `groups/` lists only `Marketing` (not `Finance`, not `Sales`); reading any `groups/Finance/*` file returns the same **HTTP status and error `code`** as a nonexistent path (body not compared). **[R]**
- AC2.2 Same for Nina and Sam. Felix opens Finance and cannot open Sales/Marketing.
- AC2.3 Access per folder as in §6.2 (`GET /api/files/tree` → `access`): Maya `read` on `shared/pricing`, Sam `write`, etc.

### 7.3 S3 — The AI is no way around it (beat 2, manual)

Prompt: `What is our margin on business cards? Check the Finance files if you need to.`
- AC3.1 Maya's AI says it cannot find or open such data; no Finance figure appears; the sources row shows no Finance path. *(manual/UI; the PRD does not rely on an API for step data.)* **[R]**
- AC3.2 Same prompt as Felix returns margins consistent with `margin-report-2026-q3q4.md` (shows the data exists and is simply not available to Maya).

### 7.4 S4 — Restricted skills are invisible too (automated)

- AC4.1 `GET /api/skills`: Felix lists `margin-check` + `quote-from-price-list`; Nina, Sam, Maya list only `quote-from-price-list`.
- AC4.2 `GET /api/skills/issues` as owner is empty.

### 7.5 S5 — Rules change takes effect at once (README walkthrough)

Owner: Admin › Folder permissions → "what a person can open" for Maya (no Finance) → add Maya as viewer on `groups/Finance` → Maya's tree shows Finance on reload → remove → gone. Exact click path documented only after being clicked through on the running app.

### 7.6 Setup and lifecycle (automated unless noted)

- AC6.1 `node scripts/demo.mjs up` on a clean checkout: preflight → fetch pinned kit → build/start → wait healthy → team + owner → seed → verify → print URL, credentials, next step. Idempotent: a second run adds nothing and does not fail.
- AC6.2 `verify` exits 0 when seeded and non-zero on any violation. *(Negative test: grant Maya read on Finance → `verify` fails.)*
- AC6.3 `down` stops and keeps data; `reset --yes` removes **only** this repo's compose project, its volume and `.demo/`, after printing their names. **[R]** (own project name, own port: never the reader's real Trina AX install).
- AC6.4 Failure messages are specific: Docker/daemon/git/Node missing, port in use, kit fetch failed, sandbox/userns/nftables/ptrace/Landlock stop, setup done with a different owner.

## 8. Technical approach

### 8.1 Why the official Docker kit + REST seeding

| Option | Real AI | Needs | Verdict |
|---|---|---|---|
| Product `bun run demo` / `demo:company` | No (AI off / recordings) | Bun 1.3.12, Go 1.27, source build | Cannot show the live quote. **[R]** Its content schema is strict (`DemoContentCompany`, unknown fields refused; needs `id`, `locale`, `demo.personas`, owner as top-level field), so this repo uses its **own** `company.json` and makes no compatibility claim. |
| **Official `docker/` kit + REST seeding** | **Yes** (reader's Claude token) | Docker on a supported host, Node ≥ 20, git | **Chosen.** Supported install path of the real product. |
| Hosted Trina | Yes | Account | Not reproducible by readers. |

**Host requirements [R]** (product's Docker guide): Linux kernel with Landlock, cgroup v2, nftables, unprivileged user namespaces (6.12+ recommended); `kernel.yama.ptrace_scope=1` on the host; 4 GB RAM for the container; Ubuntu 24.04 needs `kernel.apparmor_restrict_unprivileged_userns=0`. Product's tested hosts: Debian 12, Ubuntu 24.04 (with the setting), OrbStack on Mac; Docker Desktop on Mac "not tested"; Windows not listed. The README's tested-host matrix states only what we ran. **The engine (~300 MB) is always downloaded at container start**, with or without AI.

### 8.2 Layout

```
trina-ax-team-permissions/
  README.md  LICENSE(MIT)  package.json  .gitignore (.demo/, .trina-ax-kit/)
  company/company.json      people, groups, rules, uploaders, settings, profile, checks  (single source of truth)
  company/files/**          fixtures at team paths
  scripts/demo.mjs          CLI: up | seed | verify | ai-token | status | logs | down | reset
  scripts/lib/{config,api,kit,seed,verify}.mjs
  scripts/lint-fixtures.mjs arithmetic, cost-leak, skill header, company.json cross-reference lint
  docs/walkthrough.md  docs/recording.md  docs/timing.md
  (this file: docs/PRD.md)
```
Zero npm dependencies. Node only (Windows/macOS/Linux, no bash).

### 8.3 Flow of `up`

1. Preflight: Node ≥ 20, git, `docker info`, `docker compose`, port free.
2. Fetch `docker/` of tag `v0.5.9` by sparse clone into `.trina-ax-kit/`; write `.env` (own port **47830**, loopback, time zone). **[R]** Compose runs with **cwd = `docker/`** (the product's `seccomp.json` is read relative to it) and with `-p pinewharf-trina-ax` so it never shares project/volume with a real install.
3. `docker compose up -d --build`; poll `/api/health` (start period up to 10 min); every 30 s scan logs for the product's known stop messages and fail with a specific hint.
4. If setup needed: `docker compose exec -T trina-ax trina-ax-setup-link` → token → `POST /api/setup` (`locale: "en"`, time zone; headers `x-mycel-csrf: 1` and `Origin` as the product's own test sends). The link's code **is** the `setupToken` (verified in the product's `docker/test.sh`). **[R]**
5. Seed as the product's own seeder does, in this order: groups → people (create with temp password, sign in, change to demo password; `locale: "en"`) → folder rules (create or **replace** for `shared`; merge for others; `limited` where declared) → files → team settings (`aiSubagents: false`, time zone) → company profile. **[R]** Uploads use `onExists: "fail"` (idempotent), `mkdir` as owner first, uploader = declared person, but **`skills/**` and `shared/handbook` are uploaded by the owner** (members cannot write there).
6. `verify`, then print URL, credentials, AI step.

### 8.4 AI connection

`up` works without AI (files, permissions, skills listing). For beats 1 and 3 the reader connects their **own authorized** Claude account (Admin › Connections › AI accounts, or `node scripts/demo.mjs ai-token < token.txt`, which wraps the product's `set-claude-token`; first line of stdin, trimmed). README: usage billed to that account; context goes to the provider; the software setting does not grant permission under Anthropic's terms.

### 8.5 `verify`

For each person in `company.json → checks`: `opens` return non-empty content; `closed` return the same status+code as a nonexistent path; `hiddenInTree` names are absent from the listing; `writable`/`readOnly` match the tree's `access`; skills list contains exactly the expected seeded skills; owner sees no skill-load warnings. Prints a person × path matrix.

### 8.6 CI

`lint-fixtures` only, on push. Full `up` + `verify` is manual (host sysctls, 300 MB engine). Deferred until after M3. **[R]**

## 9. Functional requirements

| ID | Requirement |
|---|---|
| FR1 | One data file declares people, groups, rules, uploaders, settings, profile, checks; seed code has no company-specific names. |
| FR2 | `up` idempotent and resumable. |
| FR3 | Owner password random, 0600 in `.demo/`, never committed; member password public. |
| FR4 | Loopback only; README warns against exposing it. |
| FR5 | Skills: valid front matter (`name` = folder name, a–z/0–9/hyphen ≤ 64; `description` ≤ 1024; file ≤ 128 KiB); no secrets/scripts. |
| FR6 | Quote skill: reads price list + policy + ≥1 similar quote; whole-quantity tier pricing; shipping/discount rules; flags discounts above 10%; no cost/margin use; standard format with next number; draft only. |
| FR7 | Margin skill: Finance-only; supplier costs + quotes; arithmetic shown; draft for human review; no pricing decisions. |
| FR8 | `verify` per §8.5; `lint-fixtures` per §6.3. |
| FR9 | README: pitch, 4 commands, prerequisites, tested hosts, measured timings, AI connection, "shows / does not show", walkthrough, reset, license/trademark lines. GIF added only when it exists. |
| FR10 | Versions pinned in `scripts/lib/config.mjs` (one constant). **[R]** (v1 put it in `company.json`.) |

## 10. Non-functional

Fictional-only data (`.example` domains). No credentials in repo; token never printed. Cross-platform via Node. MIT licence; Trina AX (AGPL-3.0) is fetched at run time, not bundled; "not endorsed by Anthropic or OpenAI; Claude is a trademark of Anthropic". The product says its HTTP API is not yet a stable public API: client isolated in `lib/api.mjs`, version pinned, `verify` fails loudly on drift.

## 11. GIF spec

- `docs/media/quote-and-lockout.gif`, ≤ 8 MB, ≤ 1280×720, 12–15 fps; MP4/WebM fallback if too large.
- Storyboard: 0–2 s title; 2–14 s Nina's quote (sources row, $303.00 visible); 14–17 s cut to Maya's Files (no Finance); 17–27 s Maya asks the margin question, answer as produced; 27–30 s end card.
- **[R]** Capture with **two browser profiles, both on `http://127.0.0.1:<port>`** (cookie per origin; `localhost` as a second origin is not relied on: on Windows it may resolve to `::1`, which the Docker publish does not serve). Fictional data only; no setup code or token on screen; real answers only (streaming may be sped up, disclosed in `docs/recording.md`; no text edits). **[R]** The Maya answer is not pre-scripted.
- Retake rule: total ≠ $303.00 → reject and tighten the skill; never edit frames.
- Delivered by a human after `up` + AI connected. README embeds it only once committed.

## 12. Milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | PRD reviewed | this version |
| M0.5 | **Host spike [R]** | Container v0.5.9 reaches healthy on the maintainer's host (or a documented alternative host is chosen); sandbox probe result recorded |
| M1 | Fixtures + skills + `company.json` + lint | `lint-fixtures` green |
| M2 | Scripts | `up` → `verify` green on a clean volume; negative test fails as designed; default-rule assumptions confirmed empirically |
| M3 | README + walkthrough + recording guide | UI paths clicked through |
| M4 | Real-AI takes + GIF | AC1.x, AC3.x met on a take |
| M5 | Release | CI lint, tag v0.1.0 |

## 13. Risks

| Risk | Mitigation |
|---|---|
| Product API unstable | Pin; isolate client; `verify`; README note |
| Host cannot run the sandboxed container (Windows/Mac Docker untested by product) | Spike first; preflight + specific messages; tested-host matrix |
| First start is slow (engine download, build) | Measure; state honestly |
| Default `shared/` rules differ from the docs | `verify` is the arbiter; matrix updated to what a real server does |
| `limited` + `everyone`/group read semantics | Verified by `verify` on a real server |
| AI non-determinism | Hard skill wording, retake rule, golden check |
| Skill leaks Finance info | Lint (paths, figures) + AC1.2 |
| `reset` deletes a real install | Own project name/port; names printed; `--yes` |
| Provider ToS for a shared demo account | Reader's own account only; explicit notice |

Open questions (defaults chosen): repo name `trina-ax-team-permissions`; print-shop domain; MIT; English-only content.

---

## 14. Outcome of M0.5–M3 (2026-11-16)

- **M0.5 host spike: failed on the maintainer's host.** Docker Desktop 29.7.2 on WSL2 (kernel 5.15.167.4, cgroup v1, empty LSM list): the container's installer stops with `cgroup v2 (unified) is required`. Also found: Git on Windows converts the kit's shell scripts to CRLF, which makes the container die with `exec ...: no such file or directory`; fixed by cloning with `core.autocrlf=false`. `up` now detects both and says so.
- **M1, M2 done against a real server:** a Trina AX 0.5.9 development server started from source (WSL). `seed` created everything on the first run; a second run changed nothing; `verify` passed 48 checks; the negative test failed and passed as designed. The access matrix of §6.2 holds as written, including `shared/` reset to everyone-read and `skills/finance` limited. Granting a person a folder shows it on their next request.
- **M3 done:** README, walkthrough (UI paths checked), hosts, recording guide.
- **Not done:** the Docker path to a healthy server (needs a supported host), AC1.x and AC3.x (need an AI connection), the GIF (M4), CI (M5), measured timings.
