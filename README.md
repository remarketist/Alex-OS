# Alex OS

**Personal execution command center.** Turn messy ambition into daily execution.

Alex OS is a single-user life cockpit for a 60-day sprint: weekly sprint planner, daily mission
control, Telegram accountability coach, Gmail job-application tracker, personal knowledge base,
habit/body tracker, and weekly CEO review — in one dark, tactical dashboard.

> Messy goals → weekly sprints → daily missions → timed blocks → observable proof → scores → adaptation.

---

## What's inside

| Module | Route | What it does |
| --- | --- | --- |
| **Command Center** | `/` | Today's mission, live score /100, Bronze/Silver/Gold status, current & next block, quick-log buttons, block timeline, streaks, job pipeline, per-entity "fronts" |
| **Daily Planner** | `/planner` | Edit/run any day's blocks (statuses: upcoming/active/completed/missed/rescheduled/shrunk), log actual minutes & results |
| **Task Inbox** | `/inbox` | Messy text capture (⌘⏎), knowledge-base-aware categorization ("Saint" → The Saint Cocktail Bar, "health thing" → Perpetuum), schedule/backlog/kill/recurring actions, mic button for voice capture where the browser supports it |
| **Sprint Builder** | `/sprint-builder` | 5-step guided ritual: messy capture → categorize → weekly targets → day distribution (movable tasks) → activate. Activation populates the Command Center, Planner, and reminder baseline |
| **Jobs / Gmail Intelligence** | `/jobs` | Auto-detected applications CRM (company, role, source, status, reply type, next action), review queue for low-confidence detections, daily/weekly/sprint metrics, reply activity feed |
| **Habits & Body** | `/habits` | One-tap logging (workout/stretch/walk/meditation/protein), smoking counter with trigger notes + 14-day trend vs target, mood/energy sliders, sleep quality, consistency matrix |
| **Journal** | `/journal` | Six short nightly prompts, feeds daily score and weekly review |
| **End-of-Day Review** | `/end-day` | Observed reality + guided reflection → score, one hard truth, tomorrow's adjustment, minimum viable win |
| **Weekly CEO Review** | `/review` | Actual vs target table, day-score chart, best/worst day, derail trigger, double-down/kill/next-week verdicts (editable) |
| **60-Day Sprint** | `/sprint` | North star: outcome, king metric, goals, constraints, wake/sleep, capacity, tone, smoking plan, sprint-wide aggregates |
| **Knowledge Base** | `/knowledge` | Clients, personal projects, body profile, assistant rules, entity aliases — this is what makes parsing and planning personal |
| **Derail Mode** | `/derail` | Full-screen reset: 5 reset options, trigger + outcome logging |
| **Settings** | `/settings` | Telegram setup + live command console, Gmail connect/scan settings, scoring weights, reminder schedule |

## Tech stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **libSQL / Turso** — SQLite-dialect database. Local dev uses a file at `./data/alexos.db` (zero config); production uses a free hosted Turso database over HTTPS. Auto-migrated and auto-seeded on first run in both modes
- **Cloudflare Workers** deploy via `@opennextjs/cloudflare` — free hosting (config in `wrangler.jsonc`)
- **Telegram Bot API** — webhook command parser + state-aware scheduled reminders
- **Gmail API (read-only)** — OAuth flow + detection/dedup pipeline, with a demo-sync fallback that exercises the real pipeline without credentials
- **AI abstraction** (`src/lib/ai.ts`) — optional Anthropic-powered planning; deterministic fallbacks everywhere

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

That's it. On first request the app creates `data/alexos.db` (or your Turso database in
production), migrates the schema, and seeds it
with the full demo world: the "Stability & Momentum" 60-day sprint (day ~11), an active weekly
plan with blocks for every day, 4 clients (Nayam Events, SI Lounge, The Saint Cocktail Bar,
Sanki Ramen Bar), 8 personal projects, 10 days of check-ins/scores/journals, detected job
applications (incl. an interview and a rejection), Telegram history, and a past weekly review.

To reset to a fresh seed: delete `data/alexos.db*` and reload.

```bash
npm run build && npm start   # production
npx eslint src               # lint
npx tsc --noEmit             # typecheck
```

## Configure Telegram

1. Create a bot with **@BotFather** → copy the token into `.env` as `TELEGRAM_BOT_TOKEN`.
2. Message your bot once, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy
   your numeric chat id. Paste it in **Settings → Telegram** (or set `TELEGRAM_CHAT_ID`).
3. Point the webhook at your deployed app:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram/webhook`
   (optionally add `&secret_token=<TELEGRAM_WEBHOOK_SECRET>`).
4. Nothing to schedule on Cloudflare — a built-in cron trigger (wrangler.jsonc +
   custom-worker.js) hits `/api/cron/reminders` every 5 minutes automatically.
   On every tick the app auto-starts due blocks (with a Telegram ping using the
   block's own copy), asks for a completion report when a block ends, marks
   unreported blocks missed, and sends the standalone reminders. Self-hosting
   elsewhere? Any scheduler hitting that URL every 5 minutes works.
5. Use **Settings → Send test** to verify. Without a token, sends are logged as `mock` so the
   entire pipeline is testable first.

**Bot commands:** `today`, `next`, `start`, `done`, `jobs 3`, `tailored 1`, `client 90`,
`project 60`, `workout done`, `walk done`, `meditation done`, `smoked 2`, `journal <text>`,
`mood 7`, `energy 6`, `derail`, `score`. Replies update the database and dashboard.
Reminders are **state-aware**: the job-sprint ping checks whether you've actually logged
applications before it decides what to say.

## Configure Gmail (read-only)

1. Google Cloud Console → create OAuth 2.0 client (Web application).
2. Add redirect URI `<APP_URL>/api/gmail/callback`, request scope `gmail.readonly`.
3. Set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI` in `.env`.
4. **Settings → Connect Gmail** → consent → done. Sync manually from the Jobs page or let the
   daily scheduled sync run (via the same cron route, ~08:00).

Detection covers confirmation phrasing ("thank you for applying", "application received", …) and
ATS senders (Greenhouse, Lever, Ashby, Workday, BambooHR, SmartRecruiters, Jobvite, LinkedIn,
Indeed). Replies are classified (Interview / Recruiter Reply / Assessment / Rejection /
Follow-up Needed) and trigger Telegram alerts. Dedup: thread id → message id → company+role
within 3 days. Low-confidence detections land in a review queue instead of polluting metrics.
Scan window, keywords, ignored senders/companies are configurable in Settings.

Without credentials, **Run demo sync** pushes realistic fake emails through the *real*
classification/dedup pipeline so the whole Jobs module works out of the box.

> Privacy: the app only reads job-related emails for tracking. It never sends, deletes,
> archives, labels, or modifies email.

## Deploy free: Cloudflare Workers + Turso

Total cost: $0/month (Cloudflare free plan + Turso free plan).

**1. Database (Turso)** — [turso.tech](https://turso.tech), sign in with GitHub:
   - Create a database → copy its URL (`libsql://…`)
   - Create an auth token for it

**2. Hosting (Cloudflare)** — [dash.cloudflare.com](https://dash.cloudflare.com):
   - Workers & Pages → **Create** → **Workers** → **Import a repository** → pick this repo
   - Build command: `npx opennextjs-cloudflare build`
   - Deploy command: `npx opennextjs-cloudflare deploy`
   - After the first deploy: Worker → **Settings → Variables and Secrets** → add
     `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `APP_URL` (the workers.dev URL you got)
   - Redeploy (Deployments → retry) so the variables take effect

**3. Reminders** — nothing to set up: the Worker ships with a built-in cron
   trigger that fires the reminder heartbeat every 5 minutes. Optional secrets:
   `CRON_SECRET` (protects the endpoint) and `TIMEZONE` (default Europe/Bucharest).

`supabase/migrations/0001_init.sql` is kept as a reference schema for an optional future
Postgres/Supabase port; it is not needed for this deployment.

## Scoring

Daily score /100 (weights editable in Settings): Jobs 25 · Client 20 · Project 20 · Body 15 ·
Smoking 10 · Journal 10.

- **Bronze** — 2+ applications, 1 client task/60 min, walk or workout, smoking logged
- **Silver** — 5 applications, 2h client, 90m project, body done, smoking within target, journal
- **Gold** — 8+ applications, 3h+ client, 2h+ project, smoking under target, clean review

End-of-day adaptation is rule-driven: missed jobs → earlier sprint tomorrow; missed client work →
protected block; body missed 2 days → Bronze body day; smoking over target → no-smoking-before
rule; missed project → 45-minute minimum; derail → reset block.

## Jarvis Voice & Hermes Readiness

Alex OS is built so it can grow into a Jarvis-style assistant without a rewrite:

- **Alex OS** is the memory, planner, tracker, and source of truth.
- **Telegram** is the first notification + quick-reply interface.
- **Gmail** is the first passive sensor.
- **Voice** is an optional input surface: the Task Inbox mic uses browser speech recognition
  where available, and *every* input path (inbox capture, Telegram webhook, command console)
  funnels through the same text parsers (`src/lib/parser.ts`, `handleCommand` in
  `src/lib/telegram.ts`) — transcribed speech plugs straight in.
- **Hermes** (or any orchestrator) gets a clean service layer in `src/lib/services.ts`:
  `getTodayContext`, `getWeeklySprintContext`, `getKnowledgeBaseContext`,
  `createTaskFromAssistant`, `logCheckIn`, `updateDailyPlan`, `generateDailySummary`,
  `generateWeeklyReview`, `sendTelegramMessage` — plus read-only HTTP endpoints at
  `/api/context/{today|week|kb|derail}`.
- **TTS** is a future output adapter (browser speech synthesis / Telegram audio / ElevenLabs /
  OpenAI TTS); v1 deliberately keeps Telegram text as the reliable output channel.

## What's implemented vs phase 2

**Working now:** everything in the module table above, with seed data; Telegram command parser +
webhook + state-aware reminder engine + test send; Gmail OAuth flow + real sync code + demo
pipeline; scoring, adaptation, weekly review generation; knowledge-base-driven parsing; voice
capture (where the browser provides SpeechRecognition); mobile-first responsive UI.

**Needs keys/config to go live:** real Telegram sends (bot token + chat id), real Gmail scanning
(OAuth credentials), scheduled cron (deploy platform), optional AI planning (`ANTHROPIC_API_KEY`).

**Phase 2:** Supabase + auth + multi-user, Gmail push notifications (watch/Pub/Sub), richer AI
planning and summaries, WhatsApp, calendar integration, voice output, Hermes multi-agent
orchestration, payments/productization.

**Known limitations**

- Single-user by design (auth comes with the multi-user phase — don't share the URL).
- Gmail company/role extraction is heuristic — that's what the review queue is for.
- Telegram reminders fire via polling cron (5-min granularity), not exact-time push.
- Browser speech recognition is Chrome-family only; the text pipeline is the contract.
