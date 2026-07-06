# Vault router — load ONE cluster per task, never the whole vault

- Client work (content, ads, deliverables)? → `clients/<name>.md` + `playbooks/<deliverable>.md`
- Personal project work? → `projects/<name>.md`
- Choosing hosting/DB/tools? → `infra/hosting-menu.md`
- Writing copy / brand voice / how Alex decides? → `identity/alex.md`
- Agency positioning, offers, pricing? → `identity/agency.md`
- "Why did we do X?" → `log/decisions.md` (append-only)

Rules:
1. Never load more than 2 vault files for one task.
2. New client/project → copy the template at the bottom of an existing file in that folder.
3. Any session that changes reality ends with: 1 line appended to `log/decisions.md` +
   a ≤5-line update to the ONE touched file. This is part of "done".
