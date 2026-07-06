# Decisions log (append-only; date — decision — why, ≤15 words)

- 2026-07-05 — Cloudflare Workers + Turso over Railway — $0/mo vs $5/mo, user requirement.
- 2026-07-05 — libSQL over better-sqlite3 — native modules can't run on Workers.
- 2026-07-06 — Batch all DB queries — Cloudflare 50-subrequest cap killed prod once.
- 2026-07-06 — Cloudflare cron in custom-worker.js — zero external schedulers.
- 2026-07-06 — Telegram deep links from APP_URL — one-tap back into app.
- 2026-07-06 — Vault lives in repo, not local disk — cloud sessions are ephemeral.
