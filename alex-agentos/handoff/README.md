# Cross-tool handoff hook (Claude Code ⇄ OpenAI Codex)

Keeps three files current in **every git project** so any tool or session can pick up
exactly where the last one left off:

| File | Who writes it | Purpose |
|------|---------------|---------|
| `CHANGES.log` | **hook** (factual lines) + **AI** (summary + NEXT STEP) | chronological state record |
| `AGENTS.md` | hook creates it; you/AI edit | **OpenAI Codex** reads this as its instruction file |
| `CLAUDE.md` | you/AI (hook never touches it) | Claude Code's engineering memory |

## How it actually works (read this — it corrects a common misconception)

An AI model **cannot** reliably "remember to update files silently after every change" —
there's no background thread; a model only acts when it's invoked. The reliable mechanism
is a **Claude Code Stop hook**: the *harness* runs a script at the end of every turn,
deterministically, whether or not the model thinks about it. That's what this is.

Two layers, by design:
1. **Automatic (the hook, `handoff-sync.sh`)** — deterministic, git-derived, silent.
   On every turn it appends a factual line to `CHANGES.log` (which files changed / what
   was committed) and creates `AGENTS.md` if the project lacks one. It dedups (no-op turns
   add nothing) and never triggers on its own writes.
2. **Semantic (a convention the AI follows)** — the one-sentence summary and the
   `**NEXT STEP REQUIREMENT:**` line need judgement, so the AI writes those when it finishes
   meaningful work. The rule lives in `AGENTS.md` and `CLAUDE.md`. The hook guarantees the
   record exists even if a session forgets the summary.

## Install (on your Mac, once — covers all projects, past and future)

```bash
cd alex-agentos/handoff
bash install-handoff.sh --dry-run   # preview
bash install-handoff.sh             # register the global Stop hook
```

It copies `handoff-sync.sh` to `~/.claude/hooks/` and adds a `Stop` hook to
`~/.claude/settings.json` — **backing up settings.json first** and merging (it preserves
your existing settings and any existing hooks). Idempotent. Uninstall:
`bash install-handoff.sh --uninstall`.

After that, open any repo, make a change, end the turn → `CHANGES.log` updates itself.

## Honest limits (so nothing surprises you)
- **Local sessions only.** A hook in `~/.claude/settings.json` runs for Claude Code sessions
  on *this machine*. Cloud/web sessions run in a container that can't see your `~/.claude/`.
  For those, the handoff files live in the repo (committed), so they travel anyway.
- **Per machine.** Run the installer on each computer you use.
- **Git repos only.** The hook no-ops in non-git folders (avoids noise in scratch dirs).
- **`AGENTS.md` / `CHANGES.log` should be committed** — they're the shared handoff surface.
  The tiny `.claude-handoff-state` marker is auto-gitignored.
- It never edits `CLAUDE.md` and never deletes anything — append/create only.

## Why AGENTS.md?
OpenAI Codex reads `AGENTS.md` the way Claude Code reads `CLAUDE.md`. Maintaining both, in
sync, is what makes the two tools interchangeable on the same repo. The hook seeds `AGENTS.md`
as a Codex-facing mirror of your `CLAUDE.md` rules + the handoff protocol.
