# ClickIn 360 CRM — Documentation

Project documentation lives in this repo under `docs/` and is versioned with the code. After `git pull`, the same files appear locally and on GitHub — including the user manuals in `user-manual/`.

**Workflow:** edit docs locally → `git add` → `git commit` → `git push origin main`. On another machine, run `git pull origin main` to get the latest copies.

Excluded from git (local only): `.env*`, `node_modules/`, `.next/`, `.cursor/`, `test-results/`.

## User manuals

| Language | Guide |
|----------|--------|
| **English** | [user-manual/USER-MANUAL-EN.md](./user-manual/USER-MANUAL-EN.md) |
| **Español** | [user-manual/USER-MANUAL-ES.md](./user-manual/USER-MANUAL-ES.md) |

See also [user-manual/README.md](./user-manual/README.md) for audience and related links.

## Technical & operations

- [CRM-FEATURES.md](./CRM-FEATURES.md) — feature inventory and changelog
- [CLICKIN360-CRM-API.md](./CLICKIN360-CRM-API.md) — HTTP API reference
- [AUTH-ROADMAP.md](./AUTH-ROADMAP.md) — login, Google SSO, roles
- [AUDIT-FIX-TRACKER.md](./AUDIT-FIX-TRACKER.md) — security and performance backlog
- [n8n/automations-setup-guide.md](./n8n/automations-setup-guide.md) — N8N workflows and webhooks
