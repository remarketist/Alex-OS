# NEXT — session handoff (read me first, any model)

_Last updated: 2026-07-06. Read `CLAUDE.md` for constraints, `.claude/skills/verify-app` before pushing._

## Current state
- App is LIVE on Cloudflare Workers (`alexos` worker) + Turso, $0/mo. `main` auto-deploys.
- Telegram: token + chat ID configured; heartbeat cron ships pings with deep links every
  block start/end. Webhook may still need one click: Settings → "Enable replies".
- Gmail: demo pipeline works; real OAuth creds NOT yet created by Alex (Google Cloud Console).
- Mobile: "More" dropdown nav; overflow fixed (grid-cols-1 rule in CLAUDE.md).

## In flight / recently landed
- Telegram deep links (`sendTelegramMessage(text, cmd, "/planner")`) — landed.
- CLAUDE.md, verify-app skill, docs/JARVIS-BLUEPRINT.md, this file — landed (setup audit).

## Next 3 concrete steps
1. Alex: confirm a real block-start ping arrived on Telegram; if not, run Settings →
   "Run heartbeat now" and check Cloudflare Worker logs for `[route] GET /api/cron/reminders`.
2. Alex: create Gmail OAuth client (README §Configure Gmail) → set 3 secrets → Connect → real sync.
3. Any model: when Alex reports a bug, reproduce locally first (`npm run dev`), fix,
   then run the verify-app skill end to end before touching `main`.

## Known sharp edges for the next session
- 50-subrequest Cloudflare cap: batch ALL new queries (`batchAll`). Check budget per verify-app §4.
- `pkill -f "next start"` self-kills the shell. Use `kill $(pgrep -f next-server | head -1)`.
- Seed data has demo job applications (OLIPOP, Northbeam…) — Alex may ask to purge them
  once real Gmail sync works: `DELETE FROM job_applications WHERE gmail_message_id LIKE 'mock-%'` (+ demo-%).
