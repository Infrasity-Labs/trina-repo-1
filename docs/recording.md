# Recording the GIF

Target: `docs/media/quote-and-lockout.gif` (≤ 8 MB, ≤ 1280×720, 12–15 fps, loops). Add an MP4/WebM next to it if the GIF is too large.

## Before you record

1. A host that can run Trina AX (see [hosts.md](hosts.md)), `node scripts/demo.mjs up`, and `verify` green.
2. Connect **your own** Claude account: `claude setup-token`, then `node scripts/demo.mjs ai-token < token.txt`.
3. Two browser profiles, both on `http://127.0.0.1:<port>` (the session cookie belongs to one address; do not rely on `localhost`). Profile A signed in as `nina`, profile B as `maya`. Password is printed by `up`.
4. Nothing on screen except fictional data: no setup code, no token, no owner password.
5. Run the take against a fresh team (`reset --yes`, `up`) so Nina's list and sources are clean.

## Shot list (~30 s)

| Time | Shot |
|---|---|
| 0–2 s | Title card: "Pinewharf Print Co. · same AI, different people" |
| 2–14 s | Profile A (Nina): new chat, send the prompt below. Answer streams. Open the sources/steps row: price list, discount policy, a file from `shared/quotes/`. Pause on the total. |
| 14–17 s | Profile B (Maya): Files. `shared/` and `groups/Marketing` only; open `groups/` to show there is no Finance. |
| 17–27 s | Profile B: send the margin prompt. Show the answer as it comes. |
| 27–30 s | End card: repo name and the four commands. |

Prompts:

```
/quote-from-price-list Harbor Dental wants 500 double-sided business cards and 2 roll-up banners. Can you quote it?
```
```
What is our margin on business cards? Check the Finance files if you need to.
```

## Acceptance for a take

- Quote lines match the golden answer: cards 500 × $0.22 = $110.00; banners 2 × $89.00 = $178.00; subtotal $288.00; no discount; shipping $15.00; total **$303.00**; number Q-2026-0048.
- The sources row shows no `groups/Finance/` path for Nina, and Maya's answer contains no cost figure.
- If the total is different, reject the take and tighten `skills/quote-from-price-list/SKILL.md`. Never edit frames or text.
- Speeding up the streaming is allowed; say so in the commit that adds the GIF.

Optional extra take: add "and the customer wants 12% off" to Nina's prompt. The skill must leave the discount out and say Sam Reyes has to approve it.
