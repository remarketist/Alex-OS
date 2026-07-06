---
name: verify-app
description: Full verification loop for Alex OS — run before every push to main. Checks types, lint, build, boots the real app, exercises key flows, enforces the Cloudflare subrequest budget, and validates the worker bundle. Use after any nontrivial code change, when asked to "verify", or before merging/deploying.
---

# Verify Alex OS

Run every step. A step failing means STOP, fix, restart the loop. Do not push to `main` with any step red.

## 1. Static
```bash
npx tsc --noEmit && npx eslint src --max-warnings=0 && npm run build
```

## 2. Boot the real app (fresh seed)
```bash
kill $(pgrep -f next-server | head -1) 2>/dev/null; rm -f data/alexos.db*
(PORT=3777 npx next start -p 3777 >/tmp/verify.log 2>&1 &); sleep 5
for p in / /planner /inbox /sprint-builder /jobs /habits /journal /review /sprint /knowledge /settings /derail /end-day; do
  echo -n "$p: "; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3777$p"; done
```
All must be 200. (Never `pkill -f "next start"` — it kills your own shell.)

## 3. Functional smokes (the flows that matter)
```bash
# KB alias parsing
curl -s -X POST localhost:3777/api/parse -H 'Content-Type: application/json' -d '{"raw":"fix Nayam ad and do Saint reels"}'
# expect entity_name "Nayam Events" and "The Saint Cocktail Bar"

# Telegram command parser
curl -s -X POST localhost:3777/api/telegram/command -H 'Content-Type: application/json' -d '{"text":"score"}'

# Gmail demo sync dedup: run twice, second run MUST report detected:0
curl -s -X POST localhost:3777/api/gmail/sync -H 'Content-Type: application/json' -d '{"mode":"demo"}'
curl -s -X POST localhost:3777/api/gmail/sync -H 'Content-Type: application/json' -d '{"mode":"demo"}'

# Heartbeat tick
curl -s localhost:3777/api/cron/reminders
```

## 4. Subrequest budget (CRITICAL — prod dies above 50 Turso round-trips/request)
Restart with `DB_DEBUG=1`, hit each page, count `[db]` lines per request:
```bash
kill $(pgrep -f next-server | head -1); rm -f data/alexos.db*
(DB_DEBUG=1 PORT=3777 npx next start -p 3777 >/tmp/verify-db.log 2>&1 &); sleep 5
curl -s -o /dev/null localhost:3777/  # cold (schema+seed)
for p in / /jobs /review /habits /sprint /settings; do
  b=$(grep -c "\[db\]" /tmp/verify-db.log); curl -s -o /dev/null "localhost:3777$p"
  a=$(grep -c "\[db\]" /tmp/verify-db.log); echo "$p: $((a-b)) round-trips"; done
```
Budget: every page ≤ 15 warm; cold start ≤ 20. If over: batch queries via `batchAll` (see `src/lib/db.ts`).

## 5. Mobile overflow (if any UI changed)
390px viewport must have zero horizontal overflow. Playwright check:
`document.documentElement.scrollWidth - clientWidth === 0` on /, /settings, /jobs.
Known cause: responsive grid without an explicit `grid-cols-1` base.

## 6. Worker bundle (if wrangler.jsonc, custom-worker.js, or deps changed)
```bash
npx opennextjs-cloudflare build && npx wrangler deploy --dry-run
```

## 7. Ship
Commit on the working branch, merge to `main` (Cloudflare auto-deploys `main`), then
confirm the deployment goes green in the Cloudflare dashboard before declaring done.
