# AGENTS.md — instructions for OpenAI Codex (and other coding agents)

Codex-facing mirror of `CLAUDE.md`. Read `CLAUDE.md` for the full engineering memory;
this file carries the rules a coding agent must not violate, plus the handoff protocol.

## Project
**Alex OS** — Next.js 16 (App Router) + TypeScript + Tailwind v4 personal execution app.
DB: libSQL (local file in dev, Turso over HTTPS in prod). Hosting: Cloudflare Workers via
`@opennextjs/cloudflare` (entry `custom-worker.js`, config `wrangler.jsonc`, worker name `alexos`).
There is also `alex-agentos/` (a Claude Code agent library) and `vault/` (clustered memory) in this repo.

## Hard rules (violating these breaks production)
1. **Cloudflare free = 50 subrequests per request; every Turso query is one.** Never add
   per-row queries in loops. Batch via `batchAll` / `batchWrite` in `src/lib/db.ts`. Budget ≤ ~15 round-trips/page.
2. **Timezone**: server is UTC; app runs on `TIMEZONE` (default Europe/Bucharest). Use
   `todayStr()/nowTimeStr()/todayDow()` from `src/lib/dates.ts`, never raw `new Date()` date math server-side.
3. SQLite dialect only (works on local file AND Turso). No Postgres-isms.
4. Data layer is async; rows come back as `Record<string,unknown>` — cast `as unknown as T`.
5. Every responsive grid needs an explicit base (`grid grid-cols-1 …`) or mobile overflows.

## Typing & style
- Strict, explicit TypeScript. No `any` unless unavoidable and commented.
- Match the surrounding code's naming, structure, and comment density. Don't restructure without reason.
- Server components fetch via `q`/`batchAll`; interactivity lives in `*Client.tsx` files.

## Definition of done (do not hand back red)
```
npx tsc --noEmit && npx eslint src && npm run build
```
Then boot and smoke it: `npx next start -p 3777`, curl the changed pages; for worker changes,
`npx wrangler deploy --dry-run`. Deploy = push to `main` (Cloudflare auto-builds `main`).

## Handoff protocol (Claude Code AND Codex follow this)
- On start: read the bottom of `CHANGES.log` — it tells you what the last session did and the NEXT STEP.
- On finishing meaningful work, append to `CHANGES.log`:
  1. one factual sentence of what you did, then
  2. `**NEXT STEP REQUIREMENT:** <the exact next thing to build>`.
- The Stop hook records file-level changes automatically; you add the human-readable summary.
- Keep `CLAUDE.md` (Claude) and this file (Codex) in sync when rules change.
