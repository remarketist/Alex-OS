# Accounts map (services + where secrets live — NEVER store secret values here)

| Service | Account | Used for | Secrets live in |
|---------|---------|----------|-----------------|
| GitHub | remarketist | repos (Alex-OS) | — |
| Cloudflare | alex-pelicuda | Workers hosting (worker: `alexos`) | Worker → Settings → Variables |
| Turso | (GitHub login) | Alex OS database | Cloudflare Worker secrets |
| Telegram | @BotFather bot | heartbeat + commands | TELEGRAM_BOT_TOKEN in CF secrets |
| Google Cloud | alex.pelicuda@gmail.com | Gmail OAuth (pending setup) | CF secrets when created |
| Railway | (trial) | DELETED?/unused — verify no charges | — |
