# ClickIn 360 CRM — Features & Roadmap

Living documentation for what the CRM does today, what shipped recently, and what phase we are in. **Update this file when merging to `main`** (see [Maintenance](#maintenance)).

Related docs:

- [CLICKIN360-CRM-API.md](./CLICKIN360-CRM-API.md) — HTTP API reference
- [AUDIT-FIX-TRACKER.md](./AUDIT-FIX-TRACKER.md) — security/performance fix backlog

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
| Auth | NextAuth (credentials → Supabase Auth) |
| Database | Supabase Postgres + RLS on tenant tables |
| Server data access | Service role in API routes (not browser Supabase for CRM entities) |
| Files | Supabase Storage (documents, quote logos) |
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

- Login (NextAuth + Supabase password)
- Forgot password / reset password (`/forgot-password`, `/reset-password`, `/auth/callback`)
- Account profile and password change
- Workspace owner can delete own account (guarded)

### Home (dashboard)

- Greeting and stat cards: leads, prospects, active contacts, open tickets, pending tasks, upcoming appointments
- Quick links into core modules

### Contacts

- **Detail layout:** 2 columns — contact details (5/12) + work panel tabs (7/12: Log activity, Related, Tasks)
- **Company** as text field on contact (Accounts object removed from nav; `/accounts` redirects to contacts)
- **Contact-centric links:** tickets, opportunities, calendar events, and attachments require a linked contact (not account-only); legacy `company_id` is derived from the contact when present
- Full contact profile (About/notes, website, source, insights, address, assignment, etc.)
- Inline editing on detail view
- Color-coded quick actions (call, email, note, task, review)
- Activity timestamps use contact timezone → user notification timezone → browser
- Appointments appear on activity timeline; website reschedule updates existing event (no duplicate)
- Notes, tasks (with assignee/due), activity feed (notes + activities including email metadata)
- **Notes & tasks:** edit and delete from activity timeline / tasks panel (author or admin)
- **Gmail:** send with **templates**, **Cc**, and **reply** (In-Reply-To threading); sync thread into `contact_emails`; auto-sync after send and on panel load (~2 min)
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

- List/detail with subject, tags, custom fields, service ticket numbers
- **Requires linked contact** on create (legacy `company_id` synced from contact when present)
- **Gmail threads** on ticket (sync/send APIs)
- Prompt to send review invitation when closed

### Quotes & documents

- **Quotes** module: list, create, edit, line items from **Product Catalog**
- Quote templates, branding (logo, company name), EN/ES locale for PDF/UI
- Sequential reference numbers (`Q-YYYY-#####`)
- PDF generation and **send via Gmail** (connected user)
- **Public quote page** (`/quote/[token]`) — accept / decline
- Quote analytics API
- Legacy **Documents** routes still present (`/documents`) alongside quotes
- Attachments list with optional signed URLs

### Product catalog

- **Tools → Product Catalog** (`/services`) — day-to-day catalog browse/use on quotes
- **Settings** — owner/admin price edits and deletes
- `quote_services` + `quote_line_items` tables

### Calendar

- Month view, upcoming list, contact-related events
- **Requires linked contact** on create (website bookings always set `contact_id`)
- Google Calendar sync (per user who connected; event assignee preferred)
- **Appointments** (website bookings) vs **meetings** — rose vs location-based colors, legend
- `event_kind` column (migration 032)
- Booking availability in Settings (Lead API uses this)

### Payments

- Payment history list (linked to contacts/opportunities)

### Analytics

- Pipeline metrics
- Operations analytics API

### Search

- Global CRM search (sanitized patterns)

### Notifications

- In-app notifications (tickets, tasks, opportunities, inbound email, etc.)
- Per-user notification preferences (`email_notifications`, task/opportunity/ticket toggles, timezone)

### Settings (owner / admin)

- Platform language (EN/ES)
- **Integrations** — unified Google Workspace panel (OAuth checklist, Gmail + Calendar connect/disconnect per user)
- Quote branding and services catalog entry point
- Booking availability
- Website leads (default assignee)
- Google review invitation URL + review email template (category `review_request`)
- Email templates manager (create, edit, delete) — excludes automation and review templates from the general list
- Duplicate contacts panel
- Team invites and roles (`sales`, `admin`, `viewer`)
- **Audit log** (read-only; owner/admin)
- Custom fields (contacts, opportunities, tickets)

### Settings (all members)

- Language card
- **Integrations** — connect own Gmail and Google Calendar for send/sync and calendar events

### Integrations (external)

| Integration | Auth | Purpose |
|-------------|------|---------|
| Lead API | `x-website-secret` | Webchat, forms, booking offers/slots/bookings — **creates contacts** (not `companies` rows) |
| Website chat | Public + optional secret | Marketing chat widget |
| PATCH integrations | Integration secret | Server-to-server updates |
| N8N webhooks | Outbound from CRM | `contact.*`, `website.lead`, etc. |

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

Production should run migrations **001–048** in order. Notable groups:

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

**Phase 5 is complete.** **Phase 6 is in progress** — Gmail compose/sync, integrations UI, and pipeline UX shipped on `main` @ `37c8ae2`; product roadmap items below remain backlog.

---

## Missing / next (Phase 6)

### Done since Phase 5 (shipped on `main`)

| Item | Commit / notes |
|------|----------------|
| **Services catalog tool** | `/services` — quote line-item catalog (rename to **Product Catalog** in UI) |
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

### Post–Phase 5 ops (do first)

| # | Item | Notes |
|---|------|--------|
| 1 | **VPS deploy** | Pull `main` @ `37c8ae2`; run migrations **044–048** if not applied; rebuild Docker (`scripts/deploy-vps.sh`) |
| 2 | **GA4 conversions** | Mark `generate_lead`, `booking_completed` in GA4 Admin |
| 3 | **GSC follow-up** | Fix remaining 404s / canonical issues after sitemap deploy |
| 4 | **AUDIT-FIX-TRACKER F1–F2, F5–F6** | Async contact combobox; batch signed URLs; storage cleanup; remove unused dashboard stats API |
| 5 | **Audit log coverage** | Expand beyond settings / delete / team (quotes, imports, merge, catalog CRUD) |

### Phase 6 — product (ordered backlog, not started)

| # | Area | Idea |
|---|------|------|
| 6 | **Quote UX** | Align quote line-item copy with Product Catalog; consolidate `/documents` vs `/quotes` flows |
| 7 | **Reporting** | Deeper dashboards, CSV exports, scheduled reports |
| 8 | **Automation** | In-app workflows beyond N8N webhooks |
| 9 | **Quality** | E2E or integration test suite in CI |
| 10 | **Compliance** | Audit log retention policy; admin export |
| 11 | **Multi-workspace** | Single user in multiple tenants (not supported today) |
| 12 | **Billing** | Subscriptions / usage metering (not in app) |

### Known limitations

- CRM does not use Supabase Auth session for data reads; all tenant access is API + service role.
- Gmail and Google Calendar are **per-user** — each teammate connects their own account in Settings → Integrations.
- Customer email replies sync only when the **mailbox that sent** (or owns the thread) is connected with read scope.
- Viewer role is intentionally read-only demo mode.
- `audit_logs` table existed for a long time before writes; historical rows may be empty.

---

## Module index (routes)

| UI path | Purpose |
|---------|---------|
| `/dashboard` | Home stats |
| `/accounts`, `/accounts/[id]` | Redirect to `/contacts` (legacy URLs) |
| `/contacts`, `/contacts/[id]` | People |
| `/opportunities` | Pipeline board |
| `/tickets`, `/tickets/[id]` | Support |
| `/quotes`, `/quotes/new`, `/quotes/[id]` | Quotes |
| `/services` | Product catalog tool (quote line items) |
| `/attachments` | Files |
| `/calendar` | Events |
| `/payments` | Payments |
| `/analytics` | Charts |
| `/settings` | Workspace config |
| `/account` | User profile |
| `/quote/[token]` | Public quote accept/decline |

---

*Last updated: 2026-05-27 (`main` @ `37c8ae2`).*
