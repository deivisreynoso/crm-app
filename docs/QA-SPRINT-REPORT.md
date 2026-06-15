# QA Sprint Report — 2026-06-10

Comprehensive audit per CRM Quality Assurance & Optimization Sprint spec. **Audit-first** methodology: baseline established, prioritized fixes applied, full manual role-matrix testing deferred where multi-role credentials were unavailable.

## Baseline

| Check | Result |
|-------|--------|
| `npm run build` | Pass |
| `npm run test:e2e` (crm-full + smoke specs) | Pass (Owner credentials in `.env.local`) |
| Migrations read (001–074) | No schema conflicts found; **074_project_stages.sql** must be applied manually in Supabase if not yet run |

## Fixes applied this sprint

### P2 — Security / data display

| ID | Issue | Root cause | Fix |
|----|-------|------------|-----|
| QA-P2-1 | Public onboarding/feedback/quote accept had no rate limiting | Only support CID and project-feedback had `checkRateLimit` | Added IP rate limits: onboarding POST 10/h, feedback POST 10/h, quote respond 20/h, checkout 10/h |
| QA-P2-2 | Day-14 feedback comment hidden in activity timeline | Activity logged rating only; comment in metadata unused | Enriched log description + activity-feed mapper for `metadata.rating` |

### P2 — Performance (merged PR #4)

| ID | Issue | Fix |
|----|-------|-----|
| QA-P2-3 | Contact detail loaded all tabs eagerly | Lazy-load hooks per tab (`enabled` option) |
| QA-P2-4 | Activity feed N+1 author lookups | Parallel queries + `skipAuthAdminLookup` |
| QA-P2-10 | Conversations list loaded all messages per page | Parallel per-conversation last-message queries (`limit 1`) |
| QA-P2-11 | `AcceptedQuoteSelect` loaded 200 documents on mount | Lazy-load on focus (limit 50); preset value fetches single quote |
| QA-P2-12 | Opportunities query unbounded | `.limit(1000)` safety cap |
| QA-P2-13 | Custom fields POST/PATCH/DELETE lacked manage guard | `requireWorkspaceManage()` on mutating routes |
| QA-P2-14 | Lead form, forgot-password, verify-recovery, health unrate-limited | IP rate limits via `checkRateLimit`; health returns generic errors |

### P3 — Performance / dead pattern

| ID | Issue | Fix |
|----|-------|-----|
| QA-P3-1 | `ContactSelect` still used `useContacts(1, 200)` | Replaced with `ContactSearchCombobox` async search |
| QA-P3-6 | Deprecated `usePayments` re-export unused | Removed from `useFinanceTransactions.ts` |

### Feature (prior PR #3, verified in audit)

- Bilingual 7-section onboarding questionnaire
- Project stage stepper on contact detail for Won opportunities
- Project feedback full content in activity timeline

## Open items (not fixed — log for follow-up)

### P1 — Requires production verification

| ID | Item | Notes |
|----|------|-------|
| QA-P1-1 | Migration 074 applied in production | `project_stage`, settings columns — verify in Supabase |
| QA-P1-2 | RLS spot-check at DB level | Code review shows workspace guards; live cross-tenant test needs two workspace tokens |

### P2 — Needs manual E2E / role credentials

| ID | Area | Gap |
|----|------|-----|
| QA-P2-5 | Full role matrix (Admin/Sales/Viewer) | Only Owner E2E credentials configured |
| QA-P2-6 | Gmail/Calendar/Drive OAuth flows | Cannot automate without live Google consent |
| QA-P2-7 | Stripe Pay Now + webhooks | Needs Stripe test mode keys + webhook tunnel |
| QA-P2-8 | WhatsApp human reply from inbox | Needs live WhatsApp + N8N |
| QA-P2-9 | N8N flow execution | Flows read; runtime verification requires N8N instance |

### P3 — Polish / Sprint 6

| ID | Item |
|----|------|
| QA-P3-2 | Mobile 390px audit — Conversations, Contact detail, Finances flagged for manual pass |
| QA-P3-3 | Expand Playwright beyond 4 smoke tests (contacts CRUD, quote public page, settings) | **done** — `e2e/crm-full.spec.ts` covers all main CRM routes + public auth/support pages |
| QA-P3-4 | Finance forms still use deprecated `ContactSelect` wrapper pattern in 3 places — low traffic, same fix as QA-P3-1 |
| QA-P3-5 | In-memory rate limiter is per VPS instance — document for multi-instance deploy |

## Phase checklist summary

| Phase | Status |
|-------|--------|
| 1 — Feature audit | **Partial** — code review + Owner smoke E2E; full browser matrix manual |
| 2 — Performance | **Partial** — N+1 fixes shipped; endpoint timing benchmarks not run under load |
| 3 — Security | **Partial** — public rate limits added; RLS live test pending |
| 4 — Mobile | **Not run** — logged P3 |
| 5 — Documentation | **Done** — this report, n8n README, tracker/changelog updates |
| 6 — Bug fixes | **P2/P3 items above fixed**; P1/P2 manual items open |
| 7 — Final verification | **Blocked** on multi-role creds + production migration |

## E2E infrastructure

- `playwright.config.ts` loads `.env.local` via `@next/env`
- `e2e/helpers/auth.ts` — shared login helper
- `.env.local.example` documents `E2E_EMAIL`, `E2E_PASSWORD`, `PLAYWRIGHT_BASE_URL`

## Regression paths verified (Owner, smoke)

- Login → Dashboard loads
- Full CRM route matrix (`e2e/crm-full.spec.ts`)
- Conversations inbox loads
- Finances overview loads
- Build compiles clean

## Recommended next steps

1. Apply `migrations/074_project_stages.sql` in Supabase
2. Add `E2E_ADMIN_EMAIL`, `E2E_SALES_EMAIL`, `E2E_VIEWER_EMAIL` for role matrix Playwright suite
3. Run production RLS audit script against two test workspaces
4. Manual mobile pass on Conversations + Contact detail at 390px
