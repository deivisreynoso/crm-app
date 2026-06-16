# Code audit fix tracker

Status: **done** | **todo**

## Critical — done

| ID | Issue | Notes |
|----|--------|--------|
| C1 | Parent IDs not scoped to workspace | `lib/api/assert-workspace-parents.ts` |
| C2 | Google Calendar token workspace consistency | OAuth callback + delete sync |

## High — done

| ID | Issue | Notes |
|----|--------|--------|
| H1–H6 | Duplicate scan, storage paths, admin APIs, search sanitize, editor reset, enrich tenant | See prior commits |

## Medium — done

| ID | Issue | Notes |
|----|--------|--------|
| M1 | Duplicate `/api/calendar` route | Removed; use `/api/calendar/events` |
| M2 | `useCalendar.ts` re-export | Removed; imports use `useCalendarEvents` |
| M3 | N+1 ticket enrichment | Batch contact/company maps in `lib/ticket-queries.ts` |
| M3b | N+1 document signed URLs | `resolve_file_urls=1` opt-in (attachments page) |
| M4 | Unpaginated lists | `page`/`limit` on documents, companies, tickets APIs |
| M5 | Column fallback silent drop | `logDroppedOptionalColumn` in strip-insert/update |
| M6 | `GET /api/pipelines` seeds DB | `POST /api/pipelines/seed` + `usePipelines` auto-seed |
| M7 | Double workspace resolution | Trusted headers in middleware → `requireAuth` |
| M8 | Gmail vs Calendar token model | Documented: Gmail per-user, Calendar per workspace |

## Low — done

| ID | Issue | Notes |
|----|--------|--------|
| L1 | Settings page i18n | `settings.*` keys in en/es + `settings-page-content.tsx` |
| L2 | NextAuth session typing | `types/next-auth.d.ts` (`authUserId` for alias logins) |
| L3 | Deprecated SMTP send route | Removed `documents/[id]/send` |
| L4 | `verifyContactOwnership` duplication | `lib/contacts/verify-contact-ownership.ts` |
| L5 | Contact page i18n | `contacts.*`, `activity.*`, `quickActions.*`, `tasks.*` in en/es (Phase 5) |
| L6 | Contact-centric parent links | Tickets/events require `contact_id`; migration 037 |

## Iteration 2 — done (2026-06-10)

| ID | Item | Notes |
|----|------|--------|
| I1 | MFA scaffolding removed | `051_remove_mfa_flag.sql`; no login/session changes |
| I2 | Product catalog edit/delete | `409` when referenced on quotes |
| I3 | Unified email composer | TipTap on contacts, tickets, quotes; bcc/attachments/signature |
| I4 | Stripe quote Pay Now | Checkout session + webhooks |
| I5 | GA4 Website dashboard | `GET /api/analytics/ga4` + Analytics UI tab |
| I6 | Proposals on hold | `WHATSAPP-WEBCHAT-INBOX-PROPOSAL.md`, `SERVICE-TICKET-CID-PROPOSAL.md` — CID widget implemented; inbox partial |

## Sprint 4 — done (2026-06-14)

| ID | Item | Notes |
|----|------|--------|
| S4-1 | Google Drive Media integration | Migration 069; workspace OAuth; shared drives browse |
| S4-2 | List filter panel UX | `ListFiltersPanel` on contacts + tickets |
| S4-3 | Contact company display/PATCH | `resolve-company-display.ts`; stale `company_id` cleared on text edit |
| S4-4 | Conversations inbox | Migrations 066–068; takeover/release/delete; N8N sync |
| S4-5 | Flat sidebar nav | `MAIN_NAV` only; Attachments + Media as top-level items |

## Optional follow-ups (todo)

| ID | Idea | Status |
|----|------|--------|
| F1 | Async contact combobox instead of `useContacts(1, 200)` | **done** — `ContactSearchCombobox` (debounced search, min 2 chars) |
| F2 | Batch Supabase signed URLs for document lists | **done** — `lib/storage/batch-signed-urls.ts` |
| F3 | Remove dead dashboard/components | **done** — see list below |
| F4 | Sync API docs with route changes | **done** — `CLICKIN360-CRM-API.md` updated 2026-05-27 |
| F5 | Remove unused `GET /api/dashboard/stats` | **done** — route removed (no callers) |
| F6 | Storage object cleanup on document/contact delete | **done** — `lib/storage/cleanup-document.ts` |
| F7 | Migrations 036–037 in Supabase | **done** (035–037) |

## QA Sprint — 2026-06-10

| ID | Item | Status |
|----|------|--------|
| QA-1 | `ContactSelect` bulk `useContacts(1,200)` regression | **done** — uses `ContactSearchCombobox` |
| QA-2 | Public form rate limiting (onboarding, feedback, quote) | **done** — `checkRateLimit` on POST handlers |
| QA-3 | Day-14 feedback full content in timeline | **done** |
| QA-4 | E2E smoke harness + `.env.local.example` | **done** |
| QA-5 | `docs/n8n/README.md` | **done** |
| QA-6 | Migrations 074–079 in production Supabase | **done** — applied manually (Sprint 6) |
| QA-7 | Full role-matrix E2E (Admin/Sales/Viewer) | **pending** — needs credentials |
| QA-8 | Mobile 390px audit | **pending** — Sprint 6 |
| QA-9 | Production RLS cross-tenant test | **pending** |
| QA-10 | Webchat poll data leak (P1) | **done** — `session_secret` + HMAC in qualification |
| QA-11 | Duplicate-reviews API viewer bypass (P1) | **done** — `requireWorkspaceManage()` on all routes |
| QA-12 | Conversations list message over-fetch | **done** — per-conversation last message query |
| QA-13 | AcceptedQuoteSelect bulk document load | **done** — lazy on focus + single preset fetch |
| QA-14 | Opportunities unbounded query | **done** — `.limit(1000)` |
| QA-15 | Custom fields mutating routes auth | **done** — `requireWorkspaceManage()` |
| QA-16 | Auth/lead/health rate limiting | **done** — `checkRateLimit` on form-submission, forgot-password, verify-recovery, health |
| QA-17 | Deprecated `usePayments` export | **done** — removed |
| QA-18 | Full CRM E2E route matrix | **done** — `e2e/crm-full.spec.ts` |

## Dead code removed (2026-05-27)

`sign-out-header.tsx`, `quick-action-buttons.tsx`, `account-overview.tsx`, `contact-related-lists.tsx`, `upcoming-events.tsx`, `app-launcher.tsx`
