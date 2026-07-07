# alex-agentos

A Claude Code agent + skills library for a marketing, creative, automation, and growth agency serving local businesses, hospitality, dental/med-spa, events venues, and ecommerce.

Built for **execution, selling, client delivery, creative production, and repeatable marketing operations** — not motivation, not fantasy "Jarvis" theatre. Every agent ties output to revenue, cost, or risk. Structured so it can later back client dashboards, SaaS modules, or "Agents as a Service."

---

## What's in here

```
alex-agentos/
├── README.md                 ← this file
├── install.sh                ← safe global installer (agents + skills → ~/.claude)
├── agents/                   ← 10 specialist subagents (Markdown + YAML frontmatter)
├── skills/                   ← 8 workflows (each a folder with SKILL.md)
├── templates/                ← 9 fill-in deliverable templates
├── prompts/                  ← 9 ready-to-paste launch prompts
├── tests/                    ← 7 scenario tests with pass/fail bars
└── client-project-template/  ← copy per client; includes a scoped client agent
```

## Agents vs Skills — the mental model

- **Agents** are *specialists* — a role with judgment, an output format, and hard "never" rules. You (or the chief-strategy agent) invoke the right specialist for a task. They live in `~/.claude/agents/` and work in every project.
  - Format: a Markdown file with YAML frontmatter (`name`, `description`, optional `tools`, optional `model`) followed by the system prompt.
- **Skills** are *workflows* — a repeatable, step-by-step process that usually orchestrates one or more agents and produces a specific deliverable (an audit, a campaign, a report). They live in `~/.claude/skills/<name>/SKILL.md`.
- **Templates** are the *shape of the deliverable* (what the audit/report/brief looks like filled in).
- **Prompts** are *one-paste launchers* — copy into a session to kick off a skill with the right context.
- **Tests** are *acceptance checks* — run the scenario, compare against the pass bar, catch quality drift.

**How they work together:** a Skill runs a repeatable process → it calls the right Agents → they produce output in the shape of a Template → you launch it all with a Prompt → you keep quality honest with a Test.

## The 10 agents

| Agent | Role | Model |
|-------|------|-------|
| `alex-chief-strategy-agent` | Diagnoses, routes to specialists, synthesizes, sequences by impact | opus |
| `local-business-growth-agent` | Growth audits, funnels, revenue levers, 7/30-day plans | sonnet |
| `landing-page-cro-agent` | Landing teardown, conversion, CTA/trust/mobile, ad-match | sonnet |
| `competitor-intel-agent` | Positioning, offers, pricing, ad angles, market gaps | sonnet |
| `offer-strategy-agent` | Productized offers, pricing, guarantees, sales arguments | sonnet |
| `meta-ads-strategist` | Meta campaign structure, angles, hooks, testing | sonnet |
| `google-ads-strategist` | Search structure, intent, negatives, tracking | sonnet |
| `social-content-agent` | Organic social, reels, captions, calendars | sonnet |
| `creative-direction-agent` | Visual concept & art direction (the *what* & *why*) | opus |
| `image-video-prompt-engineer` | Production-ready image/video/edit prompts (the *how*) | inherits all tools (can drive Higgsfield MCP) |

Strategy/creative-direction run on **opus** (judgment-heavy); execution specialists run on **sonnet** (fast + cost-efficient). The prompt engineer inherits all tools so it can call the Higgsfield MCP to actually generate assets when connected.

## The 8 skills

`client-growth-audit` · `landing-page-audit` · `competitor-scan` · `meta-ad-angle-generator` · `google-ads-campaign-builder` · `restaurant-content-system` · `creative-brief-to-production-prompts` · `monthly-client-report`

## Install

```bash
cd alex-agentos
bash install.sh --dry-run   # preview — changes nothing
bash install.sh             # install agents + skills globally
```

The installer:
- creates `~/.claude/agents` and `~/.claude/skills` if missing;
- copies the 10 agents and 8 skills in;
- **never overwrites without a timestamped backup** at `~/.claude/backups/agentos-<timestamp>/`;
- prints every action.

Verify inside Claude Code with `/agents` and `/skills`.

> Note: this repo runs Claude Code in the cloud in some sessions and locally in others. `install.sh` targets whatever machine runs it. Global install = available in every project on that machine. For cloud sessions, the library travels with the repo, so agents/skills are available wherever the repo is checked out.

## Test

Tests are scenario files with explicit pass/fail bars — run one, then judge the output against it:

```
In a Claude Code session:  "Run tests/test-dental-implant-landing-page.md and grade the output against its pass bar."
```

Run them after editing an agent to catch quality regressions (does the landing-page agent still refuse to score on aesthetics? does the prompt engineer still protect logos on edits?).

## Create a new client project

1. Copy the template:
   ```bash
   cp -R client-project-template/ clients/<client-slug>/
   ```
2. Or just paste `prompts/create-client-agent.md` into a session and answer the intake questions — it fills the files for you.
3. Fill `CLAUDE.md`, `brand-voice.md`, `offers.md`, `competitors.md`, `reporting.md`.
4. Rename `.claude/agents/client-growth-agent.md` → `<client-slug>-growth-agent.md` and fill it.
5. Run `prompts/run-full-client-audit.md` to produce the onboarding audit.

## Global agents vs project agents

- **Global** (`~/.claude/agents/`, installed here): the 10 specialists — reusable across every client. Craft/discipline lives here.
- **Project** (`<client>/.claude/agents/`): one scoped agent per client that knows that client's business, voice, offers, competitors, KPIs, and forbidden claims. It defers to the global specialists but keeps them on-brand and compliant.
- Precedence: when a project agent and a global agent share a name, the project one wins in that project. Keep names distinct (`<client-slug>-growth-agent`) to run both.

## Using this for internal agency execution

Day-to-day the loop is: **intake → audit → offer → channel plan → creative → launch → report.**
1. New client → `create-client-agent` → fill the project files.
2. `client-growth-audit` → the paid diagnostic + the plan (and the engagement it justifies).
3. Sharpen with `offer-strategy-agent`, then build channels (`build-meta-campaign` / `build-google-campaign`).
4. Produce creative: `create-creative-direction` → `generate-image-video-prompts` (Higgsfield).
5. Content system on autopilot: `create-30-day-content-plan` (restaurants → `restaurant-content-system`).
6. Every cycle: `generate-client-report`.
The chief-strategy agent sits on top to route and synthesize when a job spans disciplines.

## Path to a productized "AI Agency OS" (later)

The structure is deliberately clean so it can graduate from internal tooling to product:
- **Client-facing dashboards** — the client project files (`CLAUDE.md`, `campaigns.md`, `reporting.md`) are already the data model for a per-client dashboard; surface them in a UI (the sibling Alex OS app is the pattern).
- **SaaS modules** — each skill (landing audit, competitor scan, ad builder, content system, report) is a self-contained workflow → each becomes a productized module or API endpoint.
- **Agents as a Service** — the global agents are portable specialists; a thin API + per-client context files = "rent an on-brand growth agent." The client-agent template is the multi-tenant unit.
- **Quality moat** — the tests keep output consistent as you scale delivery across many clients and cheaper models.

## Design rules (why this stays lean)
- One job per agent/skill. No omni-agents.
- Every recommendation ties to revenue, cost, or risk.
- Cheaper model on rails (skills + templates) beats an expensive model freestyling.
- Context stays per-client and small; global agents carry craft, not client facts.
- No motivational filler, no fantasy Jarvis language — this is an execution system.
