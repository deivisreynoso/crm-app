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

## Optional follow-ups (todo)

| ID | Idea | Status |
|----|------|--------|
| F1 | Async contact combobox instead of `useContacts(1, 200)` | todo |
| F2 | Batch Supabase signed URLs for document lists | todo |
| F3 | Remove dead dashboard/components | **done** — see list below |
| F4 | Sync API docs with route changes | **done** — `CLICKIN360-CRM-API.md` updated 2026-05-27 |
| F5 | Remove unused `GET /api/dashboard/stats` | todo — superseded by `lib/dashboard-stats.ts` |
| F6 | Storage object cleanup on document/contact delete | todo |
| F7 | Migrations 036–037 in Supabase | **done** (035–037) |

## Dead code removed (2026-05-27)

`sign-out-header.tsx`, `quick-action-buttons.tsx`, `account-overview.tsx`, `contact-related-lists.tsx`, `upcoming-events.tsx`, `app-launcher.tsx`
