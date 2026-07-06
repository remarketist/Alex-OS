# Infra menu — free-first defaults (justify any deviation in log/decisions.md)

| Need | Default | Cost | Notes |
|------|---------|------|-------|
| Web app / API | Cloudflare Workers (OpenNext) | $0 | proven (Alex OS); 50 subrequests/request is THE cap — batch DB calls |
| Static site / landing page | Cloudflare Pages | $0 | custom domains free |
| SQL database | Turso (libSQL) | $0 | SQLite dialect; always batch |
| Postgres (only if client demands) | Neon / Supabase free | $0 | don't default here |
| Files / media / video | Cloudflare R2 | $0 (10GB) | zero egress fees — use for client video |
| Cron / schedulers | CF cron triggers; cron-job.org | $0 | proven |
| Transactional email | Resend | $0 (100/day) | |
| Analytics | Cloudflare Web Analytics | $0 | no cookie banner |
| Payments | Stripe | 2.9% | only once revenue exists |
| Image/video/audio gen | Higgsfield MCP (connected) | credits | batch; preview low-res first |
| Templated video | Remotion (npm) | $0 | render locally; agency scale = templates |
| Video cuts/muxing | ffmpeg | $0 | |

Escalate to paid ONLY at a hard free-tier limit, never for comfort. Log it.
