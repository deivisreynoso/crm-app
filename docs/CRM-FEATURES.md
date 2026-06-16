# ClickIn 360 CRM — Features & Roadmap

Living documentation for what the CRM does today, what shipped recently, and what phase we are in. **Update this file when merging to `main`** (see [Maintenance](#maintenance)).

Related docs:

- [user-manual/USER-MANUAL-EN.md](./user-manual/USER-MANUAL-EN.md) — end-user guide (English, owner/admin)
- [user-manual/USER-MANUAL-ES.md](./user-manual/USER-MANUAL-ES.md) — manual de usuario (Español)
- [CLICKIN360-CRM-API.md](./CLICKIN360-CRM-API.md) — HTTP API reference
- [AUTH-ROADMAP.md](./AUTH-ROADMAP.md) — login methods, Google SSO, dual-email owner mapping
- [AUDIT-FIX-TRACKER.md](./AUDIT-FIX-TRACKER.md) — security/performance fix backlog
- [CUSTOMER-ONBOARDING-WORKFLOW-PROPOSAL.md](./CUSTOMER-ONBOARDING-WORKFLOW-PROPOSAL.md) — automated onboarding workflow (N8N + CRM touchpoints)

---

## Maintenance

After each merge to `main`:

1. Add a row to **Changelog** (date, short commit subject, type: `feature` | `fix` | `enhancement` | `security` | `infra`).
2. Adjust **Current features** if user-visible behavior changed.
3. Update **Phase status** and **Missing / next** if scope shifted.

```bash
git log -1 --format='%h %s (%cs)'
```

---

## Changelog (merges to `main`)

| Date | Commit | Type | Summary |
|------|--------|------|---------|
| 2026-06-16 | *(pending)* | feature | **Sprint 6:** calendar multi-attendees + `customer_meeting` kind; onboarding form refresh (escalation channel, inline booking, workspace branding); `onboarding_responses` + `project_feedback` tables; close-won N8N API; partial-payment webhook; Spanish quote_send template; analytics TanStack Query caching; N8N UPDATE workflow exports (migrations **075–079**) |
| 2026-06-15 | *(pending)* | fix + qa | **QA sprint (round 2):** conversations last-message query fix; lazy AcceptedQuoteSelect; opportunities limit; custom-fields manage guard; auth/lead/health rate limits; full CRM E2E suite (`crm-full.spec.ts`); remove deprecated `usePayments` |
| 2026-06-10 | *(pending)* | fix + qa | **QA sprint:** public form rate limits; Day-14 feedback timeline content; ContactSelect async combobox; E2E smoke harness; `docs/n8n/README.md`, `QA-SPRINT-REPORT.md` |
| 2026-06-10 | `e976846` | fix | **Performance:** contact detail lazy tab loading; parallel activity-feed queries; project feedback in timeline |
| 2026-06-10 | `16af274` | feature | **Onboarding questionnaire** 7-section bilingual wizard; project stepper on contact; branding/copy fixes |
| 2026-06-14 | *(pending)* | feature | **Sprint 5:** onboarding automation, outbound webhooks, quote expiry/versioning, invoice recurrence, loss reasons, session timeout, appointment reminder webhooks (migrations **071–073**) |
| 2026-06-14 | *(pending)* | feature | **Group notifications:** sales/support group emails + in-app prefs (migration **070**); Google Drive attach in email composer; onboarding workflow proposal |
| 2026-06-14 | `ee5093d` | feature | Google Drive **Shared drives** browse; docs pass (CRM-FEATURES, API, AUTH-ROADMAP, audit tracker, inbox proposal) |
| 2026-06-14 | `cd30229` | fix | **Google Drive Media:** upload, folders, shared-drive browse; Media page hook fix |
| 2026-06-14 | `c0966ba` | fix | Google Drive connected status + OAuth redirect URI docs in Integrations UI |
| 2026-06-14 | `1dbe485` | feature | **Google Drive Media** (`/media`), flat sidebar nav (Attachments + Media), modern `ListFiltersPanel` on contacts/tickets; migration **069** |
| 2026-06-14 | `f6b6ece` | fix | Contact **company** display enrichment + PATCH sync (`resolve-company-display`); booking validation; confirm dialogs |
| 2026-06-13 | `cd49754` | feature | Conversation **notifications** (migration 068), inbox takeover/release/delete, contact delete fixes |
| 2026-06-13 | `b0d0329` | feature | **Unified conversations inbox** — WhatsApp + webchat threads, N8N sync/session-state APIs; migration **066** |
| 2026-06-12 | `3e6f7bc` | enhancement | Dashboard UX, notification fixes, **profile photos** (migration 065) |
| 2026-06-12 | `1ae3c18` | feature | **Website lead email notify** for assignee (migration 064); bilingual appointment confirmations |
| 2026-06-12 | `8fd5abd` | enhancement | Finances cron overdue marking, CSV exports, invoice wizard UX |
| 2026-06-12 | `da37544` | feature | **CRM enhancement sprint — iteration 3:** calendar ownership + per-user colors + My/All calendar views; Google Calendar sync uses logged-in user OAuth; meeting type removed; public `/support` CID widget + tickets; audit backlog (contact combobox, batch signed URLs, storage cleanup); migration 052 |
| 2026-06-10 | `90c7522` | feature | **CRM enhancement sprint — iteration 2:** unified email composer (TipTap rich text, merge fields, templates, attachments, preview) on contacts/tickets/quotes; product catalog edit/delete with quote-reference guard; Stripe quote Pay Now + webhooks; GA4 Website analytics tab; MFA scaffolding removed (migration 051); WhatsApp/Webchat + CID tickets remain proposal-only |
| 2026-06-10 | `c12c4d9` | feature | **CRM enhancement sprint (iteration 1):** settings redesign (member vs admin sections), quote branding + product catalog tabs on Quotes, email signatures, calendar location types (physical / Google Meet / other) + assignee, public quote acceptance disclaimer (EN/ES), N8N/WhatsApp/Stripe inbound scaffolding, admin integrations status panel |
| 2026-06-10 | `bd31186` | feature + fix | **Dual-email owner login:** canonical session maps personal + workspace emails to same CRM profile (`OWNER_LOGIN_ALIASES`, `team_members` lookup); `authUserId` for password/profile updates |
| 2026-06-10 | `ecbd72d` | feature | **Login policy:** owner/admin/sales/viewer email/password; Google SSO `@clickin360.com` only; viewers blocked from Google |
| 2026-06-10 | `4fdf298` | fix | Google OAuth post-callback redirects use public app URL (`buildAppRedirectUrl`) instead of `0.0.0.0:3000` in Docker |
| 2026-06-10 | `153aadc` | fix | Teammate login after invite: fresh service-role client for `team_members` check; password reset `token_hash` flow |
| 2026-06-09 | `72067cd` | infra | Faster VPS deploys: Dockerfile + dockerignore in repo, Docker layer cache by default, Next.js standalone image |
| 2026-06-09 | `415cba2` | fix | **Forgot password:** server API builds production `redirectTo` from `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` (fixes localhost reset links) |
| 2026-06-09 | `09cd574` | infra | Migration 048 orphan schema cleanup + `scripts/db-preflight-audit.sql` |
| 2026-06-09 | `abc1320` | feature + infra | Mailgun transactional email; production OAuth redirect prefers `NEXT_PUBLIC_APP_URL` |
| 2026-05-27 | `37c8ae2` | feature + fix | **Gmail:** compose with templates, Cc, reply threading; thread-aware sync (`mailbox_user_id`); inbound email notifications; unified Integrations UI; OAuth env aliases; note/task edit-delete; migration 048 DB cleanup |
| 2026-05-27 | `5b6f6d1` | fix | Activity timeline author attribution and viewer timezone display |
| 2026-05-27 | `33b5e51` | enhancement | Drag-and-drop pipeline stage reorder in Settings |
| 2026-05-27 | `f2a9f2c` | enhancement | Pipeline board brand accents and contact activity counts |
| 2026-05-27 | `d735d0f` | fix | Timezone-aware greetings and notification deep links |
| 2026-05-27 | `662422a` | fix + enhancement | GA4 gtag retry/consent; CRM workspace scoping (opportunities, documents, pipelines); tickets/tasks edge cases |
| 2026-05-27 | `cb348eb` | feature | GA4 custom events on marketing site (CTA, scroll, booking, chat, FAQ) |
| 2026-05-27 | `215f28f` | infra | `robots.txt` + `sitemap.xml` for Search Console |
| 2026-05-27 | `ab07aca` | feature | Salesforce-style activity timeline; GA4 + cookie consent on marketing layout |
| 2026-05-27 | `8fc9cee` | feature + fix | **Phase 5 complete:** contact 2-col UX, EN/ES i18n, log activity tabs, contact-required tickets/events, appointment reschedule, delete cascades, dead code removal, migrations 035–037 |
| 2026-05-27 | `738e03a` | security + feature | Workspace audit log (admin-only UI), RLS on `audit_logs`, logging for settings / contact delete / team changes |
| 2026-05-27 | `ad323c0` | enhancement + security | Services catalog tool, API workspace hardening, pagination, pipeline seed route |
| 2026-05-26 | `81426b3` | feature | Calendar: rose color for website appointments (`event_kind`) |
| 2026-05-26 | `8f5d060` | feature | Google review invitations + homepage reviews section |
| 2026-05-26 | `00e6733` | feature | Workspace role UI gates, ticket Gmail email, public quote acceptance |
| 2026-05-26 | `357a9b0` | fix | Quote line items draft infinite re-render |
| 2026-05-26 | `5708022` | feature | Workspace roles, contacts CSV import/export, marketing site, integrations |
| 2026-05-26 | `cf7f483` | feature | Localized quotes, sequential references, Gmail PDF send |
| 2026-05-24 | `17cb476` | feature | Integration PATCH API (contacts, tickets, opportunities, accounts) |
| 2026-05-24 | `4a03d5a` | fix | Homepage chat scroll on load |
| 2026-05-24 | `1c5864a` | feature | Forgot-password / reset-password (Supabase email) |
| Earlier | `21a95b0` | feature | **Phase 4:** contact merge, in-app notifications, payments list, ticket UX |
| Earlier | `868eeca` | feature | **Phase 3:** analytics, documents, calendar, custom fields, templates |
| Earlier | `6b51a4c` | enhancement | **Phase 2:** inline edits, search, branding polish |

---

## Architecture snapshot

| Layer | Technology |
|-------|------------|
| App | Next.js (App Router), React, TanStack Query |
| Auth | NextAuth (credentials + Google Workspace SSO → Supabase Auth); canonical owner session mapping |
| Database | Supabase Postgres + RLS on tenant tables |
| Server data access | Service role in API routes (not browser Supabase for CRM entities) |
| Files | Supabase Storage (documents, quote logos, profile avatars) + **Google Drive** (workspace Media library) |
| Email (sales) | Gmail API (per connected user; read + send scopes) |
| Email (automated) | Mailgun HTTP API (`no-reply@…`); team invites today |
| Calendar | Google Calendar OAuth (per connected user; assignee → actor → owner fallback) |
| Automation | N8N via outbound webhooks + Lead API (`x-website-secret`) — no in-app email automations |
| Deploy | Docker Compose on VPS (`main` branch) |
| i18n | CRM UI: English / Spanish; marketing site: `/en`, `/es` |

---

## Workspace & access control

Multi-tenant by **workspace owner** (`user_id` on records = owner UUID). Teammates see shared CRM data.

| Role | Read CRM | Write CRM | Settings / team / audit log |
|------|----------|-----------|------------------------------|
| **Owner** | Yes | Yes | Full |
| **Admin** | Yes | Yes | Full (except delete workspace / remove owner) |
| **Sales** | Yes | Yes | Limited (language, own Gmail; no workspace admin blocks) |
| **Viewer** | Yes | No (demo) | Read-only notice only |

- Invite-only registration (`/register?invite=…`)
- Middleware enforces write/manage/owner rules on mutating API routes
- Trusted workspace headers (`x-crm-workspace-*`) after role resolution

---

## Current features (by area)

### Authentication & account

- **Login:** email/password (all roles) or **Google Workspace** (`@clickin360.com`; owner/admin/sales only — viewers use password)
- **Dual-email owner:** personal Gmail + workspace email resolve to same CRM profile via `OWNER_LOGIN_ALIASES` / `team_members` (see [AUTH-ROADMAP.md](./AUTH-ROADMAP.md))
- Forgot password / reset password (`/forgot-password`, `/reset-password`, `/auth/callback`) — reset email via `POST /api/auth/forgot-password`; production requires Supabase redirect URL `https://www.clickin360.com/auth/callback` and `NEXT_PUBLIC_APP_URL` on the server
- **My Account** (`/account`): profile, **profile photo** upload, password, **HTML email signature** (appended on Gmail compose), notification prefs, currency
- Workspace owner can delete own account (guarded)

### Home (dashboard)

- Greeting and stat cards: leads, prospects, active contacts, open tickets, pending tasks, upcoming appointments
- Quick links into core modules

### Contacts

- **List filters:** modern `ListFiltersPanel` — search, status, created date range, saved filters, clear-all, result count
- **Detail layout:** 2 columns — contact details (5/12) + work panel tabs (7/12: Log activity, Related, Tasks)
- **Company** as text field on contact (Accounts object removed from nav; `/accounts` redirects to contacts)
- **Company display:** list/detail APIs enrich `company` from linked `companies` row when `company_id` is set; PATCH clears stale `company_id` when free-text `company` is edited (`lib/contacts/resolve-company-display.ts`)
- **Website** — plain text field (`example.com`); no `https://` required in validators (unlike Settings review URL fields)
- **Contact-centric links:** tickets, opportunities, calendar events, and attachments require a linked contact (not account-only); legacy `company_id` is derived from the contact when present
- Full contact profile (About/notes, website, source, insights, address, assignment, etc.)
- Inline editing on detail view
- Color-coded quick actions (call, email, note, task, review)
- Activity timestamps use contact timezone → user notification timezone → browser
- Appointments appear on activity timeline; website reschedule updates existing event (no duplicate)
- Notes, tasks (with assignee/due), activity feed (notes + activities including email metadata)
- **Activity composer tabs:** Post | Email | Log a Call | New Task on contact detail
- **Notes & tasks:** edit and delete from activity timeline / tasks panel (author or admin)
- **Gmail — unified email composer:** rich text (bold, italic, lists, tables, links), **Cc/Bcc**, attachments (local upload + **Google Drive** picker), merge fields, template insert/save, preview, signature append; used on contact activity, send-email modal, tickets, and quote send
- **Email timeline colors:** inbound rose, outbound sky blue
- **Inbound email notifications** (preference `email_notifications`; deep link to contact)
- **Google review request** from contact — editable subject/body/Cc; workspace review template in Settings (not in general template list)
- Duplicate detection queue (scan by email/phone), merge or dismiss pairs
- **CSV import / export**
- **CRM UI i18n:** contact detail, tickets, calendar forms, quick actions, related panel (EN/ES via Settings → Platform language)
- Delete removes calendar events, documents, payments, contact notes, then contact (migrations 035–037)
- Website lead fields (`assigned_to`, source)

### Pipelines & opportunities

- Kanban board by pipeline/stage
- Create/move opportunities; **requires linked contact** (company name on contact record)
- Default pipeline seed (`POST /api/pipelines/seed`)
- Parent ID workspace validation on writes

### Service tickets

- **List filters:** `ListFiltersPanel` — status, created date range, saved filters (same pattern as contacts)
- List/detail with subject, tags, custom fields, service ticket numbers
- **Requires linked contact** on create (legacy `company_id` synced from contact when present)
- **Gmail threads** on ticket (sync/send APIs)
- Prompt to send review invitation when closed

### Quotes & documents

- **Quotes** module (`/quotes`) with tabs:
  - **All quotes** — list, create, edit, PDF, Gmail send
  - **Templates** — quote document templates
  - **Branding** (owner/admin) — logo, company name, **primary color**, **font family**, EN/ES locale
  - **Products** (owner/admin) — product catalog for line items; **edit** and **delete** (delete blocked when product is on existing quotes, with affected-quote list)
- Line items from **Product Catalog** (`quote_services` + `quote_line_items`)
- Sequential reference numbers (`Q-YYYY-#####`)
- PDF generation and **send via Gmail** (connected user; signature appended when set)
- **Public quote page** (`/quote/[token]`) — accept / decline with **binding disclaimer** checkbox (EN/ES); records `acceptance_disclaimer_acknowledged_at`; optional **Pay Now** via Stripe Checkout when quote has `payments_enabled` and Stripe is configured
- **Quote payment status** visible on quote record in CRM (all roles); Stripe config owner/admin only
- Quote analytics API
- Legacy **Documents** routes still present (`/documents`) alongside quotes
- Attachments list with optional signed URLs

### Product catalog

- **Quotes → Products** tab (owner/admin manage; all roles use on quote line items)
- **Edit** (modal) and **delete** with confirmation; `DELETE /api/quote-services/[id]` returns `409` with affected quotes when referenced
- `/services` redirects to `/quotes?tab=products`
- `quote_services` + `quote_line_items` tables

### Calendar

- Month view, upcoming list, contact-related events
- **Requires linked contact** on create (website bookings always set `contact_id`)
- **Location types:** in person, **Google Meet** (auto-generated link when Calendar connected), other
- **Assignee** field on events (`calendar_events.assigned_to`; migration 050)
- Google Calendar sync (per user who connected; Meet link created on sync when type is `google_meet`)
- **Appointments** (website bookings) vs **meetings** — rose vs location-based colors, legend
- `event_kind` column (migration 032)
- Booking availability in Settings (Lead API uses this)

### Finances

- **Finances** module (`/finances`) — overview dashboard, invoices, transactions (income/expenses), payment links
- **Invoices** — list, detail editor, PDF, send via Gmail or Mailgun, void, duplicate; filter by `contact_id` / `quote_id`
- **Invoice wizard** (`/finances/invoices?create=1`) — types (quote-linked, services, retainer, deposit, change order, milestone); collection method **manual** (log partial payments) or **payment link** (Stripe Checkout + email); review step shows quote line items; post-create email/payment-link status
- **Partial payments** — invoice status `partially_paid` until balance cleared; multiple payment links per invoice
- **Transactions ledger** — income and expenses with categories, recurrence, void
- **Payment links** — Stripe Checkout sessions tied to invoices; webhook at `POST /api/webhooks/stripe`
- **Quote billing workflow** — Finances tab on quote editor; billing progress stepper; auto-invoice from accepted quote
- **Contact related** — invoices section on contact detail with links to invoice records
- **Finance settings** (owner/admin) — default currency, tax rate, invoice numbering, due days, footer; Stripe status in Settings → Integrations
- **Overdue invoices** — daily cron `GET /api/cron/mark-overdue-invoices` (secured with `CRON_SECRET`); owner notifications when status changes to overdue
- **CSV export** — invoices and transactions export endpoints; bulk owner delete on invoices table
- **Quote currency** — `documents.currency` (migration 063); billable quotes API filter `?billable=1`

### Analytics

- Pipeline metrics
- Operations analytics API
- **Website** tab — GA4 sessions, users, pageviews, top pages, traffic sources (7/30/90 days); all roles when GA4 connected; configuration owner/admin only
- **Finances** tab — revenue overview, outstanding invoices, expense breakdown (`/analytics?tab=finances`)

### Search

- Global CRM search (sanitized patterns)

### Notifications

- In-app notifications (tickets, tasks, opportunities, inbound email, **conversations needing review**, finance events, **sales group events**, **support group events**, etc.)
- Per-user notification preferences (`email_notifications`, `conversation_notifications`, `finance_notifications`, **`sales_notifications`**, **`support_notifications`**, task/opportunity/ticket toggles, timezone)
- **Workspace group email routing** (migration **070**): configurable shared inboxes on `user_settings`
  - **Sales group** (default `sales@clickin360.com`) — website leads, invoice paid via payment link, quote accept/decline; in-app alerts to owner + sales/admin roles who opted in
  - **Support group** (default `support@clickin360.com`) — new service tickets (CRM + public widget); in-app alerts to owner/admin/support assignees who opted in
  - Configure sales address in Settings → Website leads; support address in Settings → Support widget

### Conversations (WhatsApp + webchat inbox)

- **Conversations** module (`/conversations`) — unified inbox for WhatsApp and webchat threads synced from N8N
- Filter tabs: all, needs review, WhatsApp, webchat, closed
- **Human takeover / release** — assign handler to signed-in user; return thread to AI
- **Reply** as human agent; **delete** conversation (owner/admin; messages cascade)
- N8N integration: `POST /api/integrations/conversations/session-state`, `POST /api/integrations/conversations/sync` (`x-website-secret`)
- Live webchat polling: `GET /api/website/chat/messages` for open webchat sessions
- Migrations **066** (tables), **067** (delete policy), **068** (`conversation_notifications` pref)
- Meta WhatsApp webhook remains in **N8N** (not a CRM route); see [n8n/conversations-inbox-flow-updates.md](./n8n/conversations-inbox-flow-updates.md)

### Media & attachments

- **Attachments** (`/attachments`) — Supabase-uploaded files linked to contacts (`documents` with batch signed URLs)
- **Media** (`/media`) — workspace **Google Drive** browser (owner/admin connects once per workspace)
  - Browse **Shared drives** and **My Drive**; upload files; create folders
  - **Link** Drive files to contacts (`documents.source = google_drive`, `external_id`, `external_url`)
  - OAuth scopes: full Drive + email; callback `{APP_URL}/api/auth/google-drive/callback`
  - Migration **069** (`google_drive_tokens`, document external columns)
  - Reconnect Drive after migration or scope changes (Settings → Integrations or `/media`)

### Settings (owner / admin)

- Sections gated by `lib/settings/access.ts` — members see templates, review invitations, booking, integrations; owner/admin additionally see custom fields, audit log, team, admin integrations, website leads, duplicates, platform language
- Platform language (EN/ES)
- **Admin integrations** — status panel for N8N, **Stripe** (checkout + webhook path), Mailgun, **GA4 Data API**, Google OAuth, **Support widget** (`GET /api/settings/integrations`)
- Website leads (default assignee; optional **email notify** on new leads — migration 064)
- Duplicate contacts panel
- Team invites and roles (`sales`, `admin`, `viewer`)
- **Audit log** (read-only; owner/admin)
- Custom fields (contacts, opportunities, tickets)

### Settings (all members with write access)

- **Email templates** — create, edit, delete (excludes automation and review templates from general list)
- **Google review invitations** — URL + review email template (category `review_request`)
- **Booking availability** — days, hours, duration (`PATCH /api/settings/member`)
- **Integrations** — connect own **Gmail** and **Google Calendar** for send/sync and calendar events
- **Google Drive** connect/disconnect shown in Integrations panel; only owner/admin can authorize workspace Drive

### Integrations (external)

| Integration | Auth | Purpose |
|-------------|------|---------|
| Lead API | `x-website-secret` | Webchat, forms, booking offers/slots/bookings — **creates contacts** (not `companies` rows) |
| Website chat | Public + optional secret | Marketing chat widget |
| PATCH integrations | Integration secret | Server-to-server updates |
| N8N webhooks | Outbound from CRM | `contact.*`, `website.lead`, etc. |
| N8N inbound | `x-website-secret` or `x-n8n-secret` | `POST /api/integrations/n8n/inbound`; conversation **session-state** + **sync** for inbox |
| Google Drive | Per-workspace OAuth (owner/admin) | Media library browse/link; `google_drive_tokens` keyed by workspace owner |
| Public support | Session token | `POST /api/public/support/validate-cid`, `POST /api/public/support/tickets` — CID-gated ticket widget |
| Stripe Checkout | `STRIPE_SECRET_KEY` | Public quote **Pay Now** after acceptance; invoice **payment links**; `POST /api/quotes/public/[token]/checkout` |
| Stripe webhooks | `STRIPE_WEBHOOK_SECRET` | `POST /api/webhooks/stripe` — `checkout.session.completed`, `payment_intent.succeeded`, `invoice.paid` |
| Mailgun | `MAILGUN_*` | Invoice send with payment link when Gmail not used |
| GA4 Data API | Service account env | `GET /api/analytics/ga4` — website dashboard |

See [CLICKIN360-CRM-API.md](./CLICKIN360-CRM-API.md) for endpoints.

### Marketing website (same repo)

- Localized pages: home, how-it-works, offers, services, about, contact, privacy, book-call
- Chat widget, reviews section, lead capture into CRM

### Security & compliance (current)

- Row Level Security on Supabase tenant tables
- `audit_logs`: RLS + revoke client roles; service-role writes; admin API read
- Workspace parent validation (`assert-workspace-parents`)
- Search sanitization, stripped insert/update columns
- Quotes and contact mail use Gmail; system mail (invites, future automations) uses Mailgun when `MAILGUN_*` env is set

---

## Database migrations

Production should run migrations **001–069** in order. Notable groups:

| Range | Theme |
|-------|--------|
| 001–012 | Core CRM schema, companies, associations |
| 010 | Phase 3 tables (templates, versions, notifications, saved filters, …) |
| 014–023 | Settings, team, booking, Gmail tokens |
| 024–032 | Contact delete fix, quotes, acceptance, ticket emails, reviews, calendar `event_kind` |
| 033–034 | Audit log RLS + `workspace_owner_id` |
| 035 | Contact delete CASCADE on `calendar_events` |
| 036 | Notes cleanup triggers + list/feed composite indexes |
| 037 | Require `contact_id` on tickets and calendar events; backfill from legacy company-only rows |
| 038–043 | Team profiles, author names, pipeline UX (see repo `migrations/`) |
| 044 | `has_read_access` on `google_gmail_tokens` (read scope tracking) |
| 045 | Remove automation email templates |
| 046 | `mailbox_user_id` on `contact_emails` (correct Gmail thread ownership) |
| 047 | `email_notifications` on `notification_preferences` |
| 048 | Orphan schema cleanup (legacy OAuth tables, automations, WhatsApp tables) |
| 049 | Auth user delete FKs — `ON DELETE SET NULL` for teammate removal |
| 050 | Email signatures, quote branding colors/fonts, calendar `assigned_to`, quote disclaimer timestamp |
| 051 | Remove unused `user_profiles.mfa_enabled` (iteration 2 MFA cleanup) |
| 052 | Calendar colors, CID support widget, ticket source |
| 053 | Support session language |
| 054 | Finances core — categories, transactions ledger, RLS helpers |
| 055 | Invoices, payment links, invoice numbering sequences |
| 056 | Quote `payment_status` / `amount_paid` on documents |
| 057 | Finance settings on `user_settings` (tax, invoice prefix, due days, Stripe metadata) |
| 058 | Backfill legacy `payments` into `finance_transactions`; drop `payments` table |
| 059 | Invoice wizard fields (`invoice_type`, `collection_method`, `pending` status) |
| 060 | Invoice `partially_paid` status for partial payment workflow |
| 061 | Owner-only invoice purge function for test cleanup |
| 062 | Finance function `SECURITY DEFINER` hardening |
| 063 | Quote `currency`, `finance_notifications` pref, RLS hardening |
| 064 | `website_leads_email_notify` on `user_settings` |
| 065 | `avatar_storage_path` on `user_profiles` |
| 066 | Conversations + `conversation_messages` tables |
| 067 | Conversations delete policy for workspace members |
| 068 | `conversation_notifications` on `notification_preferences` |
| 069 | `google_drive_tokens`; `documents.source` / `external_id` / `external_url` |
| 070 | `sales_group_email`, `support_group_email` on `user_settings`; `sales_notifications`, `support_notifications` on `notification_preferences` |
| 071 | Onboarding tokens on `contacts`; outbound webhook settings; `webhook_deliveries`; `session_timeout_hours` |
| 072 | Quote `expires_at`, `version`, `parent_document_id`; loss reasons; `quote_default_expiry_days` |
| 073 | Invoice recurrence (`recurrence_rule`, `recurrence_parent_id`, `is_recurring_parent`) |

---

## Phase status

Historical phases map to git eras (not separate products):

| Phase | Focus | Status |
|-------|--------|--------|
| **1 — Foundation** | Contacts, pipelines, tickets, notes, tasks, basic documents | ✅ Shipped (initial schema) |
| **2 — UX polish** | Inline edit, search, branding | ✅ Shipped |
| **3 — MVP expansion** | Analytics, documents/templates, calendar, custom fields, notification prefs | ✅ Shipped |
| **4 — Operations** | Contact merge, in-app notifications, payments, ticket improvements | ✅ Shipped |
| **5 — Production platform** | Website↔CRM, team/roles, quotes, contact UX, security, audit log | ✅ **Shipped** on `main` (`8fc9cee`) — migrations **035–037** applied in Supabase |

**Phase 5 is complete.** **Phase 6 iteration 1–3** shipped (`c12c4d9`, `90c7522`, `da37544`). **Post–Sprint 3:** Finances module, **conversations inbox** (`b0d0329`), **Google Drive Media** (`1dbe485`), list-filter UX, contact company fixes. **Partially shipped:** [WhatsApp/Webchat unified inbox](./WHATSAPP-WEBCHAT-INBOX-PROPOSAL.md) — CRM UI + N8N sync live; Meta WABA webhook stays in N8N. **Implemented:** [service ticket CID widget](./SERVICE-TICKET-CID-PROPOSAL.md) (Sprint 3).

### Navigation

- **Flat sidebar** — single `MAIN_NAV` list (no secondary section): Dashboard, Conversations, Calendars, Pipelines, Contacts, Quotes, Finances, Service Tickets, **Attachments**, **Media**
- Legacy `/accounts` redirects to contacts; `/services` redirects to quotes products tab

---

## Missing / next (Phase 6)

### Done since Phase 5 (shipped on `main`)

| Item | Commit / notes |
|------|----------------|
| **CRM enhancement sprint (iter 1)** | Settings redesign, Quotes tabs (branding/products), signatures, calendar Meet, quote disclaimer, N8N/WhatsApp/Stripe scaffolding (`c12c4d9`) |
| **CRM enhancement sprint (iter 2)** | Email composer overhaul, catalog edit/delete, Stripe Pay Now, GA4 Website tab, MFA removed (`051`) |
| **Google SSO login** | `@clickin360.com` Workspace sign-in; role-based method policy (`ecbd72d`) |
| **Dual-email owner login** | Canonical session + `authUserId` (`bd31186`) |
| **Services catalog tool** | Quotes → Products tab; `/services` redirects |
| **API workspace hardening** | Parent validation, trusted headers, pagination, pipeline seed route (`ad323c0`, `662422a`) |
| **Audit log (initial)** | Admin-only UI + RLS (`738e03a`) |
| **Marketing GA4 + SEO** | Cookie consent, custom events, robots/sitemap (`ab07aca`–`cb348eb`) |
| **Activity timeline** | Salesforce-style feed on contact detail (`ab07aca`) |
| **Migrations 035–037** | Contact delete cascades; required `contact_id` on tickets/events |
| **Gmail compose & sync** | Templates, Cc, reply, thread sync, inbound notifications (`37c8ae2`; migrations 044–047) |
| **Integrations UI** | Per-user Gmail + Calendar OAuth; env aliases `GOOGLE_CLIENT_ID` / `GOOGLE_OAUTH_*` |
| **Note/task edit-delete** | Timeline and tasks panel (`37c8ae2`) |
| **Pipeline stage reorder** | Settings drag-and-drop (`33b5e51`) |
| **Migration 048** | DB orphan cleanup — run preflight (`scripts/db-preflight-audit.sql`) first |
| **Finances sprint (current)** | Invoices, transactions, payment links, wizard, partial payments, quote billing workflow, Analytics finances tab, cron overdue marking, CSV export (migrations **054–063**) |
| **Conversations inbox** | CRM UI + N8N sync/session-state APIs (migrations **066–068**); flow patches in `docs/n8n/` |
| **Google Drive Media** | Workspace Drive OAuth, shared drives browse, link to contacts (migration **069**) |
| **List filter UX** | `ListFiltersPanel` + saved filters on contacts and tickets |
| **Contact company sync** | Display enrichment + PATCH clears stale `company_id` |
| **Profile photos** | Avatar upload on My Account (migration **065**) |
| **Website lead email** | Assignee email on new leads (migration **064**) |

### Post–Phase 5 ops (do first)

| # | Item | Notes |
|---|------|--------|
| 1 | **VPS deploy** | Pull `main`; run migrations **044–069** if not applied; set `OWNER_LOGIN_ALIASES`, Stripe, Mailgun, GA4, Google OAuth (login + Gmail + Calendar + **Drive** redirect URIs); reconnect Drive after **069**; `./scripts/deploy-vps.sh` |
| 2 | **GA4 conversions** | Mark `generate_lead`, `booking_completed`, `form_submission`, `cta_click` as conversion events in GA4 Admin (marketing site fires these via `lib/analytics/ga4-events.ts`; CRM Website tab reads aggregated traffic only) |
| 3 | **GSC follow-up** | Fix remaining 404s / canonical issues after sitemap deploy |
| 4 | **AUDIT-FIX-TRACKER F1–F2, F5–F6** | Async contact combobox; batch signed URLs; storage cleanup; remove unused dashboard stats API |
| 5 | **Audit log coverage** | Expand beyond settings / delete / team (quotes, imports, merge, catalog CRUD) |

### Phase 6 — product (ordered backlog, not started)

| # | Area | Idea |
|---|------|------|
| 6 | **Quote UX** | Consolidate `/documents` vs `/quotes` flows |
| 6b | **Unified inbox (remaining)** | Meta WABA webhook in CRM (optional); outbound WhatsApp send from CRM UI — N8N + CRM sync shipped |
| 6c | **Service tickets (public)** | CID-gated `/support` widget — implemented Sprint 3 |
| 7 | **Reporting** | Deeper dashboards, CSV exports, scheduled reports |
| 8 | **Automation** | In-app workflows beyond N8N webhooks |
| 9 | **Quality** | E2E or integration test suite in CI |
| 10 | **Compliance** | Audit log retention policy; admin export |
| 11 | **Multi-workspace** | Single user in multiple tenants (not supported today) |
| 12 | **Billing** | Subscriptions / usage metering (not in app) |

### Known limitations

- CRM does not use Supabase Auth session for data reads; all tenant access is API + service role.
- Gmail and Google Calendar are **per-user** — each teammate connects their own account in Settings → Integrations.
- **Google Drive** is **per-workspace** (one connection keyed to workspace owner UUID); owner/admin connects; all members browse/link on `/media`.
- Customer email replies sync only when the **mailbox that sent** (or owns the thread) is connected with read scope.
- Viewer role is intentionally read-only demo mode.
- `audit_logs` table existed for a long time before writes; historical rows may be empty.

---

## Module index (routes)

| UI path | Purpose |
|---------|---------|
| `/dashboard` | Home stats |
| `/conversations` | WhatsApp + webchat inbox |
| `/accounts`, `/accounts/[id]` | Redirect to `/contacts` (legacy URLs) |
| `/contacts`, `/contacts/[id]` | People |
| `/opportunities` | Pipeline board |
| `/tickets`, `/tickets/[id]` | Support |
| `/quotes`, `/quotes/new`, `/quotes/[id]` | Quotes (tabs: all, templates, branding, products) |
| `/services` | Redirects to `/quotes?tab=products` |
| `/account` | My Account (profile, avatar, signature, password) |
| `/attachments` | Supabase files linked to contacts |
| `/media` | Workspace Google Drive browser |
| `/calendar` | Events |
| `/finances`, `/finances/overview`, `/finances/invoices`, `/finances/invoices/[id]` | Finances hub, invoices, wizard (`?create=1`) |
| `/finances/transactions`, `/finances/expenses`, `/finances/payment-links` | Ledger, expenses, Stripe payment links |
| `/analytics`, `/analytics?tab=finances` | Charts; finances overview tab |
| `/settings` | Workspace config |
| `/quote/[token]` | Public quote accept/decline (disclaimer EN/ES) |
| `/onboarding/[token]` | Public onboarding questionnaire |
| `/feedback/[token]` | Post-delivery customer feedback |

### GA4 conversion events (marketing site)

Configure in GA4 Admin → Events → Mark as conversion:

| Event | Source | When fired |
|-------|--------|------------|
| `generate_lead` | `lib/analytics/ga4-events.ts` | Lead form / qualification complete |
| `booking_completed` | same | Discovery call booked |
| `form_submission` | same | Generic form submit |
| `cta_click` | same | Primary CTA interactions |

The CRM **Analytics → Website** tab uses the GA4 Data API for traffic metrics only; conversion marking is done in GA4 Admin, not in CRM code.

---

*Last updated: 2026-06-14 — Sprint 5 automation, quote expiry, invoice recurrence (migrations 071–073).*
