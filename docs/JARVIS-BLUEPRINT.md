# Jarvis Blueprint — from "one good project" to a lean agency-grade operator system

This is the install guide for everything the audit found missing. It is written so a
cheaper model (Haiku/Sonnet) can execute it step by step. Copy the vault to your LOCAL
machine (`~/claude-vault/`, optionally inside your Obsidian vault) — cloud sessions are
ephemeral; only files in git or on your machine persist.

---

## 1. The memory architecture (token-efficient "Claude vault")

**Principle: Claude never loads the whole vault. It loads a 1-page router, then exactly
one cluster.** Every file ≤ ~150 lines. Router ≤ 60 lines. This caps memory cost at
~2-3k tokens per task instead of 50k.

```
~/claude-vault/
├── INDEX.md                  ← the ONLY file always loaded (via ~/.claude/CLAUDE.md pointer)
├── identity/
│   ├── alex.md               ← who you are, tone rules, decision defaults
│   └── agency.md             ← positioning, offer, pricing, pipeline stage
├── clients/                  ← ONE file per client, same template
│   ├── nayam-events.md
│   ├── si-lounge.md
│   ├── the-saint.md
│   └── sanki-ramen.md
├── projects/                 ← ONE file per project (alex-os.md, job-automation.md, …)
├── playbooks/                ← HOW to do recurring work (reels, ads, landing pages)
│   ├── reel-production.md
│   ├── ad-campaign.md
│   └── landing-page.md
├── infra/
│   ├── hosting-menu.md       ← the free-first decision table (below)
│   └── accounts.md           ← which service, which account, where secrets live (NO secret values)
└── log/
    └── decisions.md          ← append-only: date, decision, why (10 words each)
```

**Router file (`INDEX.md`) — the whole trick:**
```md
# Vault router. Load ONE cluster per task, never more.
- Working on a client? → clients/<name>.md + playbooks/<deliverable>.md
- Working on a project? → projects/<name>.md
- Choosing infra/hosting? → infra/hosting-menu.md
- Writing copy/brand voice? → identity/alex.md
- New client/project? → copy the template at the bottom of the matching cluster file.
After any session that changes reality: append 1 line to log/decisions.md and update the ONE touched file.
```

**Global `~/.claude/CLAUDE.md` on your machine (create it — you have none):**
```md
# Alex — global rules
- Memory vault: ~/claude-vault/. Read INDEX.md first, then only the cluster the task needs.
- Never load more than 2 vault files without asking.
- Tone: firm, tactical, non-cringey. No hype copy, ever.
- Default stack: Next.js + Tailwind + Turso + Cloudflare Workers ($0 tier). Justify any paid choice.
- Before "done": run the project's verify skill if one exists; otherwise typecheck+build+boot+smoke.
- End of any session that produced decisions: update the ONE relevant vault file (≤5 lines diff).
```
That last line is the **self-maintaining memory loop** — memory updates are part of the
definition of done, not a separate chore.

**Obsidian**: point Obsidian at `~/claude-vault/` as (part of) a vault. You browse/edit
graphically; Claude reads the same markdown. No plugin needed. (Optional later: obsidian
MCP for backlinks search — not required, plain files + grep is cheaper.)

---

## 2. Skills to build (in priority order)

Skills live in `~/.claude/skills/<name>/SKILL.md` (global) or `.claude/skills/` (per repo).
Each = a checklist + exact commands. Small. One job each.

| # | Skill | What it does | Status |
|---|-------|-------------|--------|
| 1 | `verify-app` (per repo) | Full verification loop before any push | ✅ built (this repo) |
| 2 | `session-handoff` | End-of-session: update vault, write NEXT.md with state+next steps | build next |
| 3 | `competitor-research` | Input: niche+city → output: 5 competitors, offers, pricing, content angles, gaps table. Uses WebSearch; saves to clients/<name>.md | build next |
| 4 | `reel-factory` | Brief → hook options → script → Higgsfield MCP (`generate_video`, `shorts_studio_create`) → caption in client voice (reads clients/<x>.md) | build when doing client work |
| 5 | `landing-page` | Offer → wireframe → Next.js+Tailwind page → deploy to Cloudflare Pages → Playwright screenshot review loop | build when needed |
| 6 | `ad-creative` | Product shot → Higgsfield `generate_image` variants + copy matrix (3 hooks × 2 audiences) | build when needed |
| 7 | `motion` | Remotion for programmatic video (charts, text animations, templates you can re-render per client). CLI: `npx create-video`, render via `npx remotion render` | build when needed |
| 8 | `skill-writer` | The self-improvement loop (below) | build next |

**Skill-writer (self-improving system), the whole skill is this:**
```md
Trigger: I did a multi-step task type for the 2nd time, or user says "make this a skill".
1. Write ~/.claude/skills/<name>/SKILL.md: trigger line, numbered steps with EXACT commands
   that worked, the failure modes hit and their fixes.
2. Keep under 80 lines. Link vault cluster files instead of embedding knowledge.
3. Tell the user the skill now exists and what invokes it.
```
Rule of thumb: **2nd repetition → skill. 3rd repetition → script inside the skill.**

---

## 3. Marketing/creative stack (already available vs to wire)

You already have connected (use them, don't rebuild):
- **Higgsfield MCP** — image (`generate_image`), video (`generate_video`), audio/voice,
  shorts studio, upscale/outpaint/background-removal, even website deploy. This covers
  image+video+audio generation for client reels and ads.
- **Gmail MCP / Calendar MCP** — inbox + scheduling context.
- **Indeed MCP** — job search data for your own pipeline.

To add (all free/cheap):
- **Remotion** (npm, free, renders locally) — programmatic/templated video: same intro
  animation re-rendered per client, data-driven videos, captions. Complements Higgsfield
  (generative) with deterministic templates (agency scale = templates).
- **Playwright screenshot loop** (already proven in this repo) — this IS your design-review
  tool: generate page → screenshot → critique → fix → repeat. Make it a habit in skills 5/6.
- **ffmpeg** (free) — cuts, concat, audio mixing for video editing without an editor.

## 4. Infra menu — free-first defaults (put in vault as `infra/hosting-menu.md`)

| Need | Default | Cost | Notes |
|------|---------|------|-------|
| Web app / API | Cloudflare Workers (OpenNext) | $0 | proven in Alex OS; 50-subrequest cap is THE constraint |
| Static site / landing | Cloudflare Pages | $0 | instant, custom domains free |
| DB (SQL) | Turso | $0 | SQLite dialect; batch queries always |
| DB (Postgres, if truly needed) | Supabase / Neon free tier | $0 | only when a client demands PG features |
| Files/media | Cloudflare R2 | $0 (10GB) | no egress fees — key for video |
| Cron/schedulers | CF cron triggers / cron-job.org | $0 | proven here |
| Email out | Resend free tier | $0 (100/day) | for client forms/notifications |
| Analytics | Cloudflare Web Analytics | $0 | no cookie banner needed |
| Payments (later) | Stripe | 2.9% | only when revenue exists |
Escalate to paid only when a free tier's *hard limit* (not comfort) is hit. Log the decision.

---

## 5. Verification loops (make "done" mean verified)

Three loops, smallest that works:
1. **Code loop** (per repo `verify-app` skill): types → lint → build → boot real app →
   smoke the changed flow → budget checks → deploy dry-run. Never claim done off a green build alone.
2. **Design loop**: render → Playwright screenshot at 390px + 1440px → look at the image →
   fix → repeat until it matches the reference vibe. (Screenshots caught every UI bug in this project.)
3. **Business loop**: weekly — Alex OS CEO Review for life; a `clients/…` vault pass for the
   agency (what shipped, what's owed, next deliverable per client).

## 6. Cheap-model handoff protocol

What makes Haiku/Sonnet effective on your infrastructure:
1. **CLAUDE.md in every repo** (done here): commands, constraints, gotchas — the expensive
   lessons pre-paid. Cheap models fail on missing context, not missing intelligence.
2. **Skills = rails.** A cheap model following `verify-app` step-by-step outperforms an
   expensive model freestyling.
3. **NEXT.md convention**: every session ends by writing/updating `NEXT.md` in the repo —
   current state, in-flight work, exact next 3 steps. The next session (any model) starts by reading it.
4. **Route by task type**: Haiku → logging, CRUD edits, running skills, transcript summaries.
   Sonnet → features, refactors, client deliverables. Opus/top model → architecture,
   debugging across systems, anything touching production data models.
5. Vault clusters keep any model's context bill tiny (see §1).

## 7. Order of operations (do these, in order)
1. Create `~/claude-vault/` + global `~/.claude/CLAUDE.md` on your LOCAL machine (30 min: copy §1).
2. Seed `clients/` with the 4 client files — pull the content from Alex OS Knowledge Base (it's already written there).
3. Add `session-handoff` + `skill-writer` global skills (§2).
4. First revenue-facing skill: `competitor-research` (works with zero new accounts).
5. Wire Remotion + a `reel-factory` run for ONE real client deliverable — extract the skill from the transcript of doing it.
