#!/usr/bin/env bash
#
# install-handoff.sh — install the cross-tool handoff hook GLOBALLY for Claude Code.
# Registers a Stop hook in ~/.claude/settings.json so that, in EVERY local project
# (past and future) on this machine, CHANGES.log + AGENTS.md are kept current
# automatically. Safe & non-destructive: backs up settings.json before editing.
#
# Usage:
#   bash install-handoff.sh            # install
#   bash install-handoff.sh --dry-run  # show what would happen, change nothing
#   bash install-handoff.sh --uninstall
#
# Requires python3 (present on macOS by default) for safe JSON merging.

set -euo pipefail
MODE="${1:-install}"

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_SRC="$SRC_DIR/handoff-sync.sh"
CLAUDE_DIR="$HOME/.claude"
HOOKS_DIR="$CLAUDE_DIR/hooks"
HOOK_DST="$HOOKS_DIR/handoff-sync.sh"
SETTINGS="$CLAUDE_DIR/settings.json"
STAMP="$(date +%Y%m%d-%H%M%S)"

echo "==============================================="
echo " handoff hook installer  (target: $CLAUDE_DIR)"
[ "$MODE" = "--dry-run" ] && echo " MODE: DRY RUN (no changes)"
[ "$MODE" = "--uninstall" ] && echo " MODE: UNINSTALL"
echo "==============================================="

command -v python3 >/dev/null || { echo "  ERROR: python3 required for safe JSON merge."; exit 1; }

if [ "$MODE" = "--uninstall" ]; then
  if [ -f "$SETTINGS" ]; then
    cp -a "$SETTINGS" "$SETTINGS.bak-$STAMP"
    python3 - "$SETTINGS" "$HOOK_DST" <<'PY'
import json,sys
p,hook=sys.argv[1],sys.argv[2]
d=json.load(open(p))
h=d.get("hooks",{})
if "Stop" in h:
    h["Stop"]=[g for g in h["Stop"]
               if not any(hook in (x.get("command","")) for x in g.get("hooks",[]))]
    if not h["Stop"]: h.pop("Stop")
    if not h: d.pop("hooks",None)
json.dump(d,open(p,"w"),indent=2)
print("  removed Stop hook from settings.json")
PY
  fi
  echo "  (left $HOOK_DST in place; delete manually if you want)"
  echo "  Done."
  exit 0
fi

# --- 1. copy the hook script ---
echo ""
echo "▸ Installing hook script -> $HOOK_DST"
if [ "$MODE" != "--dry-run" ]; then
  mkdir -p "$HOOKS_DIR"
  cp -a "$HOOK_SRC" "$HOOK_DST"
  chmod +x "$HOOK_DST"
fi
echo "  copied and marked executable"

# --- 2. merge the Stop hook into settings.json (backup first) ---
echo ""
echo "▸ Registering Stop hook in $SETTINGS"
if [ -f "$SETTINGS" ]; then
  echo "  backup: settings.json -> settings.json.bak-$STAMP"
  [ "$MODE" != "--dry-run" ] && cp -a "$SETTINGS" "$SETTINGS.bak-$STAMP"
fi

if [ "$MODE" = "--dry-run" ]; then
  echo "  would add: hooks.Stop -> command: $HOOK_DST"
else
  python3 - "$SETTINGS" "$HOOK_DST" <<'PY'
import json,os,sys
p,hookcmd=sys.argv[1],sys.argv[2]
d={}
if os.path.exists(p):
    try: d=json.load(open(p))
    except Exception: d={}
hooks=d.setdefault("hooks",{})
stop=hooks.setdefault("Stop",[])
# already present?
present=any(hookcmd in (x.get("command","")) for g in stop for x in g.get("hooks",[]))
if not present:
    stop.append({"hooks":[{"type":"command","command":hookcmd}]})
    json.dump(d,open(p,"w"),indent=2)
    print("  added Stop hook")
else:
    print("  already registered — no change")
PY
fi

echo ""
echo "==============================================="
if [ "$MODE" = "--dry-run" ]; then
  echo " Dry run complete. No changes made."
else
  echo " Done. Every local Claude Code session on this machine will now keep"
  echo " CHANGES.log + AGENTS.md current in each git project, automatically."
  echo " Verify: run a session in any repo, make a change — CHANGES.log updates."
  echo " Uninstall anytime: bash install-handoff.sh --uninstall"
fi
echo "==============================================="
