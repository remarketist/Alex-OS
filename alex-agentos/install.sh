#!/usr/bin/env bash
#
# install.sh — install the alex-agentos agents + skills globally for Claude Code.
# Safe & non-destructive: never overwrites an existing file without a timestamped backup.
#
# Installs to:
#   ~/.claude/agents/   (global subagents — available in every project)
#   ~/.claude/skills/   (global skills — available in every project)
#
# Usage:
#   bash install.sh            # install/update global agents + skills
#   bash install.sh --dry-run  # show what would happen, change nothing

set -euo pipefail

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_SRC="$SRC_DIR/agents"
SKILLS_SRC="$SRC_DIR/skills"

CLAUDE_DIR="$HOME/.claude"
AGENTS_DST="$CLAUDE_DIR/agents"
SKILLS_DST="$CLAUDE_DIR/skills"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$CLAUDE_DIR/backups/agentos-$STAMP"

say()  { echo "  $*"; }
head() { echo ""; echo "▸ $*"; }

echo "==============================================="
echo " alex-agentos installer"
echo " source: $SRC_DIR"
echo " target: $CLAUDE_DIR"
[[ $DRY_RUN -eq 1 ]] && echo " MODE:   DRY RUN (no changes will be made)"
echo "==============================================="

# --- ensure target dirs exist ---
head "Ensuring ~/.claude/agents and ~/.claude/skills exist"
for d in "$AGENTS_DST" "$SKILLS_DST"; do
  if [[ -d "$d" ]]; then
    say "exists: $d"
  else
    say "create: $d"
    [[ $DRY_RUN -eq 0 ]] && mkdir -p "$d"
  fi
done

# --- backup helper: back up a destination path before it is overwritten ---
backup_if_exists() {
  local dst="$1"
  [[ -e "$dst" ]] || return 0
  local rel="${dst#$CLAUDE_DIR/}"
  local dest="$BACKUP_DIR/$rel"
  say "backup: $rel  ->  backups/agentos-$STAMP/$rel"
  if [[ $DRY_RUN -eq 0 ]]; then
    mkdir -p "$(dirname "$dest")"
    cp -a "$dst" "$dest"
  fi
}

# --- install agents (flat .md files) ---
head "Installing agents -> ~/.claude/agents"
if [[ -d "$AGENTS_SRC" ]]; then
  for f in "$AGENTS_SRC"/*.md; do
    [[ -e "$f" ]] || continue
    name="$(basename "$f")"
    dst="$AGENTS_DST/$name"
    backup_if_exists "$dst"
    say "install: $name"
    [[ $DRY_RUN -eq 0 ]] && cp -a "$f" "$dst"
  done
else
  say "no agents/ directory found — skipping"
fi

# --- install skills (each is a folder with SKILL.md) ---
head "Installing skills -> ~/.claude/skills"
if [[ -d "$SKILLS_SRC" ]]; then
  for dir in "$SKILLS_SRC"/*/; do
    [[ -d "$dir" ]] || continue
    name="$(basename "$dir")"
    dst="$SKILLS_DST/$name"
    backup_if_exists "$dst"
    say "install: $name/"
    if [[ $DRY_RUN -eq 0 ]]; then
      mkdir -p "$dst"
      cp -a "$dir"* "$dst"/
    fi
  done
else
  say "no skills/ directory found — skipping"
fi

echo ""
echo "==============================================="
if [[ $DRY_RUN -eq 1 ]]; then
  echo " Dry run complete. No files were changed."
else
  echo " Done. Agents and skills installed globally."
  [[ -d "$BACKUP_DIR" ]] && echo " Backups of anything overwritten: $BACKUP_DIR"
  echo ""
  echo " Verify inside Claude Code:  /agents   and   /skills"
fi
echo "==============================================="
