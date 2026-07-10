#!/usr/bin/env bash
#
# handoff-sync.sh — Claude Code **Stop hook**.
# Runs automatically (silently, no model involvement) at the end of every session
# turn. Keeps three cross-tool handoff files current in the project root so
# OpenAI Codex — or any next session — can pick up state:
#
#   CHANGES.log  chronological, factual record of what changed (git-derived)
#   AGENTS.md    Codex-facing instructions (created from template if missing)
#   CLAUDE.md    left to the human/AI to maintain; this hook never overwrites it
#
# It is deterministic and non-destructive:
#   - only acts inside a git repo (skips scratch dirs)
#   - dedups: does nothing if the working tree is unchanged since the last run
#   - only ever APPENDS to CHANGES.log and CREATES AGENTS.md if absent
#
# The AI session adds the semantic layer (one-sentence summary + NEXT STEP) per
# the convention documented in AGENTS.md / CLAUDE.md — that part needs the model.

set -euo pipefail

# --- resolve the project directory from the hook's stdin JSON (fallback: cwd) ---
INPUT="$(cat 2>/dev/null || true)"
CWD="$(printf '%s' "$INPUT" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
if [ -n "${CWD:-}" ] && [ -d "$CWD" ]; then cd "$CWD"; fi

# --- only operate inside a git repo ---
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

STATE=".claude-handoff-state"
LOG="CHANGES.log"
AGENTS="AGENTS.md"
HASH_CMD="$(command -v shasum || command -v sha1sum || echo cat)"

# Exclude the files THIS hook manages, so it never triggers on its own writes
# (which would self-loop) and so the log stays about real code changes.
EX=(':(exclude)CHANGES.log' ':(exclude)AGENTS.md' ':(exclude).claude-handoff-state' ':(exclude).gitignore')

HEAD="$(git rev-parse --short HEAD 2>/dev/null || echo none)"
DIRTY="$(git status --porcelain -- . "${EX[@]}" 2>/dev/null || true)"
# include tracked-content diff so edits to an already-dirty file re-trigger
DIFF="$(git diff HEAD -- . "${EX[@]}" 2>/dev/null || true)"
SNAP="$(printf '%s|%s|%s' "$HEAD" "$DIRTY" "$DIFF" | $HASH_CMD | awk '{print $1}')"

# dedup — nothing changed since last hook run
if [ -f "$STATE" ] && [ "$(cat "$STATE" 2>/dev/null)" = "$SNAP" ]; then exit 0; fi

# first run: seed CHANGES.log with recent history
if [ ! -f "$LOG" ]; then
  {
    echo "# CHANGES.log"
    echo ""
    echo "Chronological state record for cross-tool handoff (Claude Code <-> OpenAI Codex)."
    echo "Newest at the bottom. Hook writes factual lines; the AI session appends a"
    echo "one-sentence summary + a **NEXT STEP REQUIREMENT:** line for meaningful work."
    echo ""
    git log --pretty="- %ad %h %s" --date=short -n 20 2>/dev/null | tac || true
    echo ""
  } > "$LOG"
fi

# append a factual entry for the current change set
TS="$(date '+%Y-%m-%d %H:%M')"
if [ -n "$DIRTY" ]; then
  FILES="$(printf '%s\n' "$DIRTY" | awk '{print $NF}' | sort -u | paste -sd', ' - 2>/dev/null || true)"
  echo "- $TS (working tree) touched: ${FILES:-changes}" >> "$LOG"
elif [ "$HEAD" != "none" ]; then
  echo "- $TS committed $HEAD: $(git log -1 --pretty=%s 2>/dev/null)" >> "$LOG"
fi

# create AGENTS.md if the project has none (Codex reads this file)
if [ ! -f "$AGENTS" ]; then
  PROJ="$(basename "$ROOT")"
  cat > "$AGENTS" <<EOF
# AGENTS.md — instructions for OpenAI Codex (and other coding agents)

_Auto-created by the handoff hook. Edit freely; the hook will not overwrite it._

## Project
$PROJ. See \`CLAUDE.md\` for the full engineering memory (constraints, commands,
architecture) — this file is the Codex-facing mirror of those rules.

## Ground rules (keep in sync with CLAUDE.md)
- Match the existing code style, typing, and directory layout. Do not restructure without reason.
- Prefer strict, explicit types. No \`any\` unless unavoidable and commented.
- Before finishing: typecheck + build + run the app or tests; never hand back red.
- Read \`CHANGES.log\` (bottom entries) to see what the last session did and the NEXT STEP.

## Handoff protocol (both Claude and Codex follow this)
When you finish meaningful work, append to \`CHANGES.log\`:
1. one factual sentence of what you did, then
2. a line: **NEXT STEP REQUIREMENT:** <the exact next thing to build>.
The Stop hook records file-level changes automatically; you add the human-readable summary.
EOF
fi

echo "$SNAP" > "$STATE"
# keep the state marker out of git
if [ -f .gitignore ] && ! grep -qxF "$STATE" .gitignore 2>/dev/null; then
  echo "$STATE" >> .gitignore
fi
exit 0
