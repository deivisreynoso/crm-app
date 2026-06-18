# Environment Variables Guide

See `.env.local.example` for a copy-paste template.

## Organization

| Variable | Purpose |
|----------|---------|
| `CLICKIN360_ORG_USER_ID` | UUID of the ClickIn 360 organization owner in Supabase. All CRM records are scoped to this `user_id`. |
| `WEBSITE_LEADS_USER_ID` | **Deprecated alias** for `CLICKIN360_ORG_USER_ID` during env migration. |

## Authentication

| Variable | Purpose |
|----------|---------|
| `NEXTAUTH_SECRET` | Session encryption. Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Canonical app URL (production: `https://www.clickin360.com`) |
| `GOOGLE_OAUTH_CLIENT_ID` / `SECRET` | Google Workspace SSO (`@clickin360.com`) and integrations |

## Public API secrets

| Variable | Header | Used by |
|----------|--------|---------|
| `WEBSITE_LEADS_API_SECRET` | `x-website-secret` | `/api/leads/*`, N8N lead sync |
| `WEBCHAT_POLL_SECRET` | HMAC session secret | Webchat poll auth |
| `N8N_CRM_WEBHOOK_SECRET` | `x-n8n-secret` / `x-website-secret` | N8N inbound webhooks |

**Security notes**

- Use 32+ character random secrets (`openssl rand -hex 32`).
- Rotate quarterly or after staff changes.
- Never commit `.env.local`. All secret comparisons use timing-safe equality.
- Marketing forms call `/api/website/form-submission` (same-origin proxy); secrets stay server-side.

## Optional infrastructure

| Variable | Purpose |
|----------|---------|
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Shared rate limiting across VPS instances (future) |
| `CRON_SECRET` | Protects `/api/cron/*` |
| `SENTRY_DSN` | Error monitoring (already configured in production) |
