# Product Decisions

## Documents vs Quotes (Phase D)

**Decision: Keep separate surfaces** (2026-06).

- `/quotes` — priced proposals, acceptance, Stripe checkout, loss reasons.
- `/documents` — contracts, attachments, general files.

Shared helpers live under `lib/documents/` and `lib/quotes/`. Consolidation deferred until UX complexity justifies a redesign.

## Google SSO auto-provisioning (Phase D)

**Decision: Not enabled** (2026-06).

Internal tool requires explicit `team_members` rows. Auto-provisioning `@clickin360.com` users as Sales would weaken invite-only hiring controls. Admins invite users via Settings → Users & Roles.

## Viewer demo role

**Status: Retained** for read-only demos. `viewer` role + middleware write blocks remain. Remove when no longer used in sales demos.

## Migration 081 (CID attempt tables)

**Status: Created, not applied.** File: `migrations/081_support_cid_attempts.sql`. In-app brute-force protection uses in-memory rate limits (`lib/support/cid-auth.ts`). Apply migration when persistent audit/lockout is needed.
