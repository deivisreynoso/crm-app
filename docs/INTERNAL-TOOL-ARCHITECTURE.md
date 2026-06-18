# ClickIn 360 CRM: Internal Tool Architecture

This CRM is a **single-organization internal operations tool** for ClickIn 360 staff. It is not multi-tenant SaaS.

## Single organization

- All CRM data is pinned to `CLICKIN360_ORG_USER_ID` (Supabase user UUID of the org owner).
- `user_id` on CRM tables = organization scope, not the acting teammate.
- Marketing site and N8N integrations write into the same org.

## Access control

| Role | Access |
|------|--------|
| **Owner** | Full access; invoice delete; team role management |
| **Admin** | CRM + settings; cannot delete invoices |
| **Finance** | Finances module only (+ account settings) |
| **Sales** | Own contacts/opportunities/quotes/calendar; sales queue (`assigned_to` null) |
| **Support** | All contacts; conversations; tickets |
| **Viewer** | Read-only demo (optional; see `docs/PRODUCT-DECISIONS.md`) |

### Custom roles & permission sets (Salesforce-style)

- **Standard roles** — built-in templates (`sales`, `admin`, etc.).
- **Custom roles** — full permission profile cloned from a standard role (`workspace_custom_roles`).
- **Permission sets** — additive bundles; **deny wins** over allow when stacked.
- Migration: `082_custom_roles_permission_sets.sql`
- UI: Settings → Users & Roles → Custom roles & permission sets

Login paths:

1. **Google SSO** — `@clickin360.com` only (`hd=clickin360.com`).
2. **Email/password** — invite-only; requires `team_members` row for org owner.

Users without `team_members` membership (and who are not the org owner UUID) cannot access the CRM.

## Public surfaces

| Surface | Auth |
|---------|------|
| Marketing booking form | Same-origin → `/api/website/form-submission` |
| Lead API (N8N) | `x-website-secret` + org UUID |
| Stripe webhooks | Signature verification |
| Public quotes/onboarding | Token in URL |
| CID support widget | Rate-limited CID validation |

## Security layers

1. NextAuth session + middleware RBAC
2. API `workspaceOwnerId` filters (service-role Supabase client)
3. Postgres RLS on finance tables (defense when using user JWTs)
4. Shared-secret webhooks with timing-safe comparison
5. Per-IP rate limits (in-memory; Upstash optional)

## Future: user-scoped Supabase client

Service role bypasses RLS today. Planned hardening: user JWT client for routine CRUD, service role only for cron/webhooks. Effort: ~2 weeks. Defer until multi-instance deployment or audit requires it.
