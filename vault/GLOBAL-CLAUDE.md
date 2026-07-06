# COPY THIS FILE to ~/.claude/CLAUDE.md on any computer where you run Claude Code locally.
# (In a local desktop-app session, just say: "install vault/GLOBAL-CLAUDE.md as my global CLAUDE.md".)

# Alex — global rules
- Memory vault: `vault/` in the Alex-OS repo (github.com/remarketist/Alex-OS).
  Read `vault/INDEX.md` first, then ONLY the cluster the task needs. Max 2 vault files per task.
- Tone for all copy: firm, tactical, non-cringey. No hype, ever.
- Default stack: Next.js + Tailwind + Turso + Cloudflare Workers ($0 tier). Justify any paid choice.
- Before claiming "done": run the project's verify skill if one exists; otherwise
  typecheck + build + boot the app + smoke the changed flow.
- End any session that changed reality: append 1 line to vault/log/decisions.md and
  update the ONE touched vault file (≤5 lines).
- Repeating a task type for the 2nd time → write a skill for it (see docs/JARVIS-BLUEPRINT.md §2).
