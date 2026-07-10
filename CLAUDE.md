# Alex OS — Agent Memory

Personal execution command center for Alex (CMO-level operator, Bucharest).
Live at: value of `APP_URL` env (workers.dev domain). Owner interacts via web + Telegram.

**Memory vault**: `vault/INDEX.md` is the router for Alex's cross-project context
(clients, projects, agency, infra defaults). For client/agency/marketing tasks, read the
router + ONE cluster file. For pure code tasks in this repo, this file is enough.

## Commands
- `npm run dev` — local dev (auto-creates + seeds `data/alexos.db`)
- `npm run build` — Next build. `npx tsc --noEmit` typecheck. `npx eslint src` lint.
- `npm run cf:build` — build Cloudflare worker (OpenNext). `cf:preview`, `cf:deploy` exist.
- Reset local DB: delete `data/alexos.db*`, reload any page.
- **Deploy = push to `main`.** Cloudflare Workers Builds auto-builds/deploys `main`. Never push broken code to main.

## Stack (do not re-litigate these choices)
- Next.js 16 App Router + TS + Tailwind v4. Dark cockpit design; tokens in `src/app/globals.css`.
- DB: **libSQL** — local file in dev, **Turso over HTTPS in prod** (`TURSO_DATABASE_URL/TOKEN`). Schema+seed auto-run on first query (`src/lib/db.ts`).
- Hosting: **Cloudflare Workers** via `@opennextjs/cloudflare`. Entry is `custom-worker.js` (wraps generated worker, adds `scheduled` cron handler). Config: `wrangler.jsonc` (name **alexos** — must match the deployed worker or a new worker gets created without secrets).
- Everything chosen for **$0/month** (Cloudflare free + Turso free). Keep it that way.

## Hard constraints (violating these breaks production)
1. **Cloudflare free = max 50 subrequests per invocation. Every Turso query is one subrequest.**
   Never add per-row queries in loops. Use `batchAll`/`batchWrite` from `src/lib/db.ts`
   (many SQL statements = ONE round-trip). Budget: any page ≤ ~15 round-trips.
2. **Timezone**: server is UTC; the app runs on `TIMEZONE` env (default Europe/Bucharest).
   Always use `todayStr()/nowTimeStr()/todayDow()` from `src/lib/dates.ts`, never `new Date()` date math on the server.
3. Gmail sync fetches ≤ 20 messages/run (`GMAIL_MAX_MESSAGES_PER_SYNC`) — subrequest budget.
4. All SQL is SQLite dialect (works on local file AND Turso). No Postgres-isms.
5. Data layer is async; rows come back as `Record<string,unknown>` — cast with `as unknown as T`.

## Architecture map (1 line each)
- `src/lib/db.ts` — client, schema, ready-gate, batching, partial-seed self-heal
- `src/lib/seed.ts` — demo world, 7 batched phases
- `src/lib/scoring.ts` — DayStats + score/100 + Bronze/Silver/Gold levels
- `src/lib/telegram.ts` — send (+`appLink` deep links), command parser (`handleCommand`), **`processBlockTicks`** = the heartbeat (auto-start blocks, end-of-block report pings, mark missed)
- `src/lib/gmail.ts` — OAuth, job-application detection/classification/dedup, demo sync, `jobMetrics`
- `src/lib/parser.ts` — messy text → categorized tasks via KB aliases ("Saint"→The Saint Cocktail Bar)
- `src/lib/sprint-builder.ts` — weekly plan generation + activation
- `src/lib/services.ts` — Hermes-ready service layer (getTodayContext etc.); read API at `/api/context/{today|week|kb|derail}`
- `src/app/api/cron/reminders` — the 5-min tick (fired by Cloudflare cron trigger in custom-worker.js)
- Pages are server components fetching via `q`/`batchAll`; interactivity in `*Client.tsx` files.

## Conventions
- Tone of all user-facing copy: firm, tactical, non-cringey. No "you got this" hype.
- Every responsive grid needs an explicit base (`grid grid-cols-1 …`) — implicit tracks caused mobile overflow once already.
- Telegram messages get a deep link via the 3rd arg of `sendTelegramMessage(text, command, linkPath)`.
- Verify before pushing: `npx tsc --noEmit && npx eslint src && npm run build`, then boot `npx next start -p 3777`, curl the pages, and (for worker changes) `npx wrangler deploy --dry-run`.
- Commit style: what+why paragraph, no fluff. Work on `claude/alex-os-build-xz6ppi`, merge to `main` when verified.

## Gotchas learned the hard way
- `pkill -f "next start"` kills your own shell (matches the command string) → `kill $(pgrep -f next-server | head -1)`.
- Old servers hold ports → EADDRINUSE looks like your change failed when it's a stale process.
- `cp -r scaffold/. repo/` can clobber `.git` — never copy dot-everything into a repo root.
- Worker name mismatch (wrangler vs dashboard) silently deploys a second worker without env vars.
- Partial seed (crash mid-seed) is auto-healed by `init()` in db.ts (checks job_application_events marker).

## Environment variables (all set as Cloudflare Worker secrets)
`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
`TELEGRAM_WEBHOOK_SECRET?`, `GMAIL_CLIENT_ID/SECRET/REDIRECT_URI`, `CRON_SECRET?`, `TIMEZONE?`, `ANTHROPIC_API_KEY?`.

## Cross-tool handoff (Claude Code ⇄ Codex)
- `AGENTS.md` is the Codex-facing mirror of this file — keep them in sync when rules change.
- `CHANGES.log` is the running state record. On start, read its bottom entries (what the last
  session did + the NEXT STEP). On finishing meaningful work, append a one-sentence summary +
  a `**NEXT STEP REQUIREMENT:**` line.
- A Stop hook (`alex-agentos/handoff/`) records file-level changes automatically once installed
  locally (`bash alex-agentos/handoff/install-handoff.sh`); the AI adds the semantic summary.

## Current state / phase 2 backlog
Working: all pages, heartbeat pings, Telegram commands via webhook, demo Gmail pipeline, scoring/adaptation/reviews.
Pending user config: real Gmail OAuth creds. Phase 2: AI-assisted planning (`src/lib/ai.ts` is wired, needs key),
voice input beyond browser SpeechRecognition, WhatsApp, multi-user/auth (single-user today — do not share URL).
