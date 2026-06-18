# Code review remediation — remaining manual steps

Items from the comprehensive code review that need **your action** on VPS, Supabase, or N8N.

## VPS / ops

| ID | Action |
|----|--------|
| **D1** | Add **2 GB swap** on the VPS before the next full Docker build (`fallocate` + `mkswap` + `swapon`). |
| **M3** | Add lightweight uptime/error monitoring (Uptime Kuma, Better Stack, or log shipping). Sentry was removed for memory. |
| **D4** | Never run `docker compose … --remove-orphans` against mixed stacks (Caddy was removed once). |

## Database

| ID | Action |
|----|--------|
| **M9** | Apply migration `082_custom_roles_permission_sets.sql` (and `081_support_cid_attempts.sql` if you want DB-backed CID lockout). |
| **C1 verify** | After deploy, trigger N8N flows: onboarding kickoff, close-won, google-review-sent, contact activities. |

## Secrets (optional hardening)

| ID | Action |
|----|--------|
| **H5** | Split `WEBSITE_LEADS_API_SECRET` per integration class (leads vs conversations vs cron) when you can rotate N8N credentials. |

## Permission sets rollout

1. Apply migration `082`.
2. Settings → Users & Roles → **Custom roles & permission sets**.
3. Create a permission set (e.g. “Export access”) or custom role cloned from Sales.
4. Assign via API `PATCH /api/team/members/{userId}` with `custom_role_id` or `permission_set_ids`.

Deny in a permission set always overrides allow (Salesforce most-restrictive rule).
