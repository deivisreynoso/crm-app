# ClickIn 360 CRM — User Manual (English)

**Audience:** Workspace owners, admins, and sales team
**Version:** 2026-06-15

This manual describes day-to-day use of the ClickIn 360 CRM. UI labels match the English locale (`lib/crm/locales/en.json`).

---

## Table of contents

1. [Getting started](#1-getting-started)
2. [Roles and permissions](#2-roles-and-permissions)
3. [Navigation](#3-navigation)
4. [Full customer lifecycle](#4-full-customer-lifecycle)
5. [Dashboard & analytics](#5-dashboard--analytics)
6. [Contacts](#6-contacts)
7. [Pipelines & sales cycle](#7-pipelines--sales-cycle)
8. [Quotes](#8-quotes)
9. [Finances](#9-finances)
10. [Project cycle](#10-project-cycle)
11. [Calendars](#11-calendars)
12. [Conversations](#12-conversations)
13. [Service tickets](#13-service-tickets)
14. [Attachments & Media](#14-attachments--media)
15. [Notifications](#15-notifications)
16. [My account](#16-my-account)
17. [Settings (workspace)](#17-settings-workspace)
18. [Customer-facing pages](#18-customer-facing-pages)
19. [Troubleshooting](#19-troubleshooting)

---

## 1. Getting started

### Sign in

Open your CRM URL (e.g. `https://www.clickin360.com/login`). Sign in with email and password, or Google Workspace (`@clickin360.com`).

| Role | Email/password | Google SSO |
|---|---|---|
| Owner, Admin, Sales | Yes | Yes |
| Viewer | Yes | No — password only |

### Forgot password

1. Go to **Forgot password**
2. Enter your email — if an account exists, you receive a reset link
3. Set a new password on the reset page

### First-time teammates

1. Owner or admin sends a team invite from **Settings → Team**
2. Open the invite link and register at `/register?invite=…`
3. Sign in with the assigned role

### Change CRM language

**Settings → Platform language** — switches navigation and common labels between English and Spanish.

> **Note:** Customer emails and public pages (quotes, onboarding, booking) use each contact's **preferred language**, not the workspace language.

---

## 2. Roles and permissions

| Capability | Owner | Admin | Sales | Viewer |
|---|---|---|---|---|
| View CRM data | ✓ | ✓ | ✓ | ✓ |
| Create / edit records | ✓ | ✓ | ✓ | ✗ |
| Send Gmail from CRM | ✓ | ✓ | ✓ | ✗ |
| Take over conversations | ✓ | ✓ | ✓ | ✗ |
| Move pipeline stages | ✓ | ✓ | ✓ | ✗ |
| Create invoices & collect payments | ✓ | ✓ | ✓ | ✗ |
| Advance project stages | ✓ | ✓ | ✓ | ✗ |
| Connect workspace Google Drive | ✓ | ✓ | ✓ | ✗ |
| Connect personal Gmail & Calendar | ✓ | ✓ | ✓ | ✗ |
| Delete records & conversations | ✓ | ✓ | ✗ | ✗ |
| Void invoices, duplicate, deactivate links | ✓ | ✓ | ✗ | ✗ |
| View expenses | ✓ | ✓ | ✗ | ✗ |
| Admin settings & team | ✓ | ✓ | ✗ | ✗ |
| Audit log | ✓ | ✓ | ✗ | ✗ |

**Viewer:** Read-only demo mode. Write actions are hidden in the UI and blocked by the API.

**Sales:** Can manage contacts, quotes, tickets, conversations, invoices, payments, project stages, and connect workspace Drive. **Cannot** delete records, view expenses, access admin settings, or view the audit log.

**Owner / Admin:** Full access including deletes, expenses, high-risk actions (void invoices, disconnect workspace Drive), and all workspace settings.

---

## 3. Navigation

The sidebar includes:

| Menu | Path | Purpose |
|---|---|---|
| Dashboard | `/dashboard` | Stats and analytics tabs |
| Conversations | `/conversations` | WhatsApp + webchat inbox |
| Calendars | `/calendar` | Meetings and website bookings |
| Pipelines | `/opportunities` | Kanban sales board and project cycle |
| Contacts | `/contacts` | People and companies |
| Quotes | `/quotes` | Quotes, templates, branding, catalog |
| Finances | `/finances` | Invoices, transactions, payment links |
| Service Tickets | `/tickets` | Support tickets |
| Attachments | `/attachments` | Files in Supabase |
| Media | `/media` | Workspace Google Drive |

**Settings** and **My account** are in the header.

Use **⌘K** (Mac) or **Ctrl+K** (Windows) for global search across contacts, quotes, invoices, tickets, and conversations.

---

## 4. Full customer lifecycle

This is the most important section of the manual. Before using the CRM, understand how a customer moves from first contact to active client and brand advocate.

The lifecycle has two main phases in sequence:

```
PHASE 1 — SALES CYCLE
Lead → Prospect → [Quote sent → Quote accepted + Invoice paid]
                                                    ↓
PHASE 2 — PROJECT CYCLE
Onboarding → Design → Configuration → Launch → Optimization → Complete
                                                    ↓
                                    Internal feedback form
                                         ↓              ↓
                               Positive feedback    Negative feedback
                               → Google review    → Team alert
                                 link               (no review)
```

### Phase 1 — Sales cycle

The sales cycle starts when a lead enters the CRM and ends when the quote is accepted **and** the invoice is paid. Until then, the contact is in the commercial phase.

**How leads enter:**

| Source | How they arrive | Initial status |
|---|---|---|
| Website form | Fills contact form | Lead |
| AI chat (webchat) | Andrea qualifies on site chat | Lead |
| WhatsApp AI | Andrea qualifies via WhatsApp | Lead |
| Manual entry | Team member creates contact | Lead |
| CSV import | Bulk contact upload | Lead |

**Contact statuses during the sales cycle:**

| Status | Meaning | How assigned |
|---|---|---|
| **Lead** | New contact — may be in conversation, booked a meeting, or in follow-up | Manual or automatic by source |
| **Prospect** | Qualified — ideal client, high purchase intent | Manual by sales team |
| **Active** | Won client — quote accepted and invoice paid | **Automatic** when both conditions met |
| **Inactive** | Inactive — lost client or no activity | Manual by owner/admin |

> **Key rule:** A contact becomes **Active** automatically when **both** conditions are met: quote accepted **and** invoice paid. Not before.

**Typical sales progression:**

```
Lead enters CRM
    ↓
AI conversation (webchat or WhatsApp)
    ↓
Discovery meeting booked
    ↓
Qualified by team → status: Prospect
    ↓
Quote sent
    ↓
Client accepts quote → /quote/[token]
    ↓
Invoice created and sent
    ↓
Invoice paid (manual or Stripe)
    ↓
Status: Active — project cycle begins
```

**Leads needing more attention:**

If a lead is not ready to buy, the team can:
- Set status to **Lead** and add follow-up notes
- Create tasks with follow-up dates
- Log calls on the timeline
- Keep the conversation active from the Conversations inbox

There is no separate "Nurturing" status — follow-up is managed via tasks, notes, and contact activities.

### Phase 2 — Project cycle

The project cycle starts automatically when a contact becomes **Active**. The linked opportunity is marked **Won** and the project stage stepper activates.

**Project stages:**

| # | Stage | Description |
|---|---|---|
| 1 | **Onboarding** | Kickoff, questionnaire, asset and access collection |
| 2 | **Design** | Creative direction, wireframes, brand assets |
| 3 | **Configuration** | Technical setup, integrations, automations |
| 4 | **Launch** | Go-live, testing, client delivery |
| 5 | **Optimization** | Post-launch tuning, performance review |
| 6 | **Complete** | Project delivered and approved by client |
| 7 | **Maintenance** | *(Optional)* Clients with active retainer |

**Automations in this cycle:**

| Moment | What happens automatically |
|---|---|
| Quote accepted + invoice paid | N8N starts onboarding flow — welcome email, questionnaire, task creation |
| Client completes questionnaire | CID assigned, task marked complete, owner notified |
| Kickoff booked | Calendar event, 24h and 1h reminders |
| Project → Complete | N8N sends internal feedback form to client |
| Positive feedback (≥ 4/5) | After 24 hours, N8N sends Google review link |
| Negative feedback (< 4/5) | Owner alert — no review link sent |

> **Important:** The Google review link is **never sent when onboarding completes**. It is only sent after the project is **Complete** and the client left **positive feedback**. This ensures reviews reflect the full project experience.

---

## 5. Dashboard & analytics

Open **Dashboard** (`/dashboard`). Below the greeting, use the tabs:

| Tab | Content |
|---|---|
| Overview | Cards: new leads, prospects, active contacts, open tickets, pending tasks, upcoming appointments |
| Operations | Operational metrics for the date range |
| Pipeline | Pipeline analytics; optional stage filter |
| Website | GA4 traffic (sessions, users, page views, conversions) |
| Finances | Revenue, expenses (owner/admin), outstanding invoices |

### Date filters

Shared bar on Operations, Pipeline, Website, and Finances:
- **From / To** selectors
- Shortcuts: Last 7 days, Last 30 days, Last 90 days, Year to date

The range persists when switching tabs.

> **Owner / Admin:** Configure GA4 in **Settings → Integrations** (service account + property ID).
>
> **Sales / Viewer:** Can view analytics; expenses on the Finances tab are hidden for Sales and Viewer.

---

## 6. Contacts

### List view

1. Open **Contacts**
2. Use the filter panel: search, Status (Lead, Prospect, Active, Inactive), date range, saved filters
3. Click a row to open detail

### Import / export

- **Import CSV** — field mapping, duplicate handling (skip / merge / create)
- **Export CSV** — all contact fields

> **Owner / Admin:** Run **Settings → Duplicate contacts** to scan and merge pairs.

### Contact detail

Two-column layout:

**Left — Details:** Name, email, phone, company, website, status, assignment, address, preferred language, custom fields.

**Right — Work panel:** Log activity, Related, Tasks tabs.

### Log activity

| Tab | Action |
|---|---|
| Post | Add note |
| Email | Gmail composer (rich text, Cc/Bcc, attachments, merge fields, templates, preview, signature) |
| Log a Call | Log a call |
| New Task | Create task with assignee and due date |

### Timeline

Automatically shows all events linked to the contact:
- Notes and calls
- Inbound emails (pink) and outbound (sky blue)
- Tasks created and completed
- Opportunities and pipeline stage changes
- **Project stage changes** (e.g. *"Project stage: Design → Configuration"*)
- Calendar events and bookings
- Support tickets
- Onboarding and automation events
- Linked payments and invoices
- System events

### Quick actions

Bar: Note · Call · Email · Review · Task.

**Request review** sends a Google review invitation via connected Gmail.

> **Note:** Automatic post-project reviews are sent only after positive feedback. This manual action is independent and can be used anytime.

### Start Onboarding button

Visible on the contact profile for **Owner / Admin** when the contact is **Active** and has no active onboarding process.

On click: confirmation → N8N starts the onboarding flow manually (useful for migrated clients or special cases).

If onboarding is already in progress: shows an *"Onboarding in progress — started [date]"* badge instead of the button.

### Delete contact

> **Owner / admin only.** Removes linked calendar events, documents, payments, and notes. Use with caution. Deletions may appear in **Settings → Audit log**.

> **Sales:** Can create and edit contacts but cannot delete them.

> **Viewer:** Cannot edit contacts, send email, or create notes/tasks.

---

## 7. Pipelines & sales cycle

### Board view

1. Open **Pipelines** (`/opportunities`)
2. View opportunities on the Kanban board by stage
3. Drag cards between stages to update status
4. Create opportunities — requires a linked contact

### Pipeline stages (pre-sale)

Pipeline stages represent opportunity progress **before** closing the sale. Owner/admin can customize and reorder stages in **Settings**.

Typical stage flow:

```
New → Contacted → Proposal sent → Negotiation → Won / Lost
```

**Won:** The opportunity is marked won when the quote is accepted and the invoice is paid. At this point:
- The opportunity appears as **Won** on the board
- The project cycle activates automatically
- Project stage is set to **Onboarding**

**Lost:** If the quote is rejected or the client does not continue, a loss reason (required) and optional notes are recorded. Loss reasons are analyzed on the Dashboard **Pipeline** tab.

### Loss reason

When moving an opportunity to **Lost** or when the client rejects a quote, a form appears:
- **Reason** (required): select from the list configured in **Settings → Project Stages**
- **Notes** (optional): additional details

Default reasons: Price too high, Chose competitor, Budget cut, No decision, Timing issue, Out of scope, Other.

> **Owner / Admin:** Customize loss reasons in **Settings → Project Stages**. Only owner/admin can delete opportunities.
>
> **Sales:** Can move opportunities between stages and create new ones; cannot delete opportunities or change stage configuration.
>
> **Viewer:** Read-only — cannot drag or edit.

---

## 8. Quotes

Open **Quotes**. Tabs:

| Tab | Purpose |
|---|---|
| All quotes | List, create, edit, send |
| Templates | Reusable templates |
| Branding | Logo, colors, name on PDF |
| Product catalog | Products for line items |

> **Owner / admin only:** Branding tab and catalog price edit/delete.

### Create and send

1. Click **New quote**
2. Select **Client** (contact)
3. Add services from catalog or create new lines
4. Set tax, discount, terms, and due date
5. **Save** — automatic reference (`Q-YYYY-#####`)
6. **Send via Gmail** — PDF attached; your signature is appended if configured

### Quote expiration

Quotes have a configurable due date (default: 30 days from send). List indicators:
- Green: valid
- Amber: expires in 3 days or less
- Red: expired

An expired quote blocks acceptance on the client page. Owner/admin can extend the date from quote detail.

### Quote versioning

If you edit a quote already sent or accepted, the system automatically creates a new version (v2, v3…) and preserves the previous as read-only. Version history is available in quote detail.

> Clients using an older version link see: *"A newer version of this quote exists."*

### Client acceptance

1. Client receives the link by email and opens `/quote/[token]`
2. Reviews terms and quote in preferred language (EN/ES)
3. Accepts or rejects with required liability checkbox
4. Status updates in CRM; activity logged on contact

**Pay Now** appears when Stripe is configured and payments are enabled on the quote. The client can pay directly from the acceptance page.

### Quote → invoice → collection flow

```
Quote accepted
    ↓
Create invoice from quote Finances tab
    ↓
Send invoice to client (Gmail or Mailgun)
    ↓
Collection: manual (log payment) or payment link (Stripe)
    ↓
Invoice paid → quote status: Paid
    ↓
Contact → Active — project cycle begins
```

> **Note:** The invoice should always be linked to the accepted quote so the onboarding flow activates correctly.

---

## 9. Finances

Open **Finances**. Sections:

| Section | Path | Purpose |
|---|---|---|
| Overview | Dashboard → Finances tab | KPIs for selected range |
| Invoices | `/finances/invoices` | Create, send, collect |
| Transactions | `/finances/transactions` | Income and expense ledger |
| Expenses | `/finances/expenses` | Expense log (owner/admin) |
| Payment links | `/finances/payment-links` | Stripe links |

> **Owner / Admin:** Full access including expenses, void/duplicate invoices, deactivate links, and finance settings.
>
> **Sales:** Can create invoices, send them, log payments, and generate payment links. Cannot view expenses, void invoices, or duplicate them.
>
> **Viewer:** Cannot create invoices or view expense data.

### Create invoice

1. **Finances → Invoices → Create**
2. **Type:** from accepted quote (recommended), standalone, retainer, deposit, milestone, etc.
3. **Collection:** manual (log payments) or payment link (Stripe)
4. **Send** via Gmail or Mailgun — PDF in contact language, payment link as CTA

> **Best practice:** Always create the invoice from an accepted quote. This links payment to the project cycle and triggers onboarding automatically on payment.

### Partial payments

Invoice shows `partially_paid` status until the total is covered. Linked quote payment status syncs automatically.

### Recurring invoices

For retainers or recurring services, enable **Recurring** on the invoice — set frequency, interval, and optional end date. Invoices generate automatically each cycle.

### Finance settings

**Settings → Finances** (owner/admin): currency (USD/MXN), default tax, invoice prefix, due days, footer text.

---

## 10. Project cycle

This section applies **only to contacts in Active status** (accepted quote and paid invoice). The project cycle is where work is delivered to the client.

### Accessing project stages

The project stage stepper appears on the **contact detail** (Active contacts) and on the linked won opportunity.

The stepper also appears as a badge on:
- The opportunity row on the board
- The contact detail header
- The contact **Related** section

### Stages and responsibilities

| Stage | Typical owner | What happens |
|---|---|---|
| **Onboarding** | Account Owner | Kickoff booked, questionnaire completed, assets collected, team tasks created |
| **Design** | Creative team | Brand direction, wireframes, visual deliverables |
| **Configuration** | Technical team | Integrations, N8N automations, platform setup |
| **Launch** | Technical team + Account Owner | Go-live, final testing, client delivery |
| **Optimization** | Account Owner | Post-launch follow-up, performance tuning |
| **Complete** | Account Owner | Project approved by client, formal close |
| **Maintenance** | Account Owner | Active only for retainers — enable in Settings → Project Stages |

### Advancing stages

**Owner, admin, and sales** can advance stages from contact or opportunity detail:

- **Advance stage** button — moves one stage forward with confirmation
- **Stage selector** — move to any stage (moving backward requires confirmation + reason)

Each stage change:
1. Logs the transition on the contact timeline (*"Project stage: Configuration → Launch"*)
2. Notifies the workspace owner in the app
3. Fires the `project.stage_changed` webhook to N8N

### When the project reaches Complete

When marking the project **Complete**:

1. `project_completed_at` is recorded automatically
2. N8N sends the **internal feedback form** to the client (`/project-feedback/[token]`)
3. The client rates their experience (1–5 stars) and answers optional questions

**Feedback flow:**

```
Client receives feedback form
    ↓
    ├── Rating ≥ 4 (positive)
    │       ↓
    │   Immediate thank-you email
    │       ↓
    │   Wait 24 hours (configurable)
    │       ↓
    │   Google review link sent
    │
    └── Rating < 4 (negative/neutral)
            ↓
        Immediate thank-you email
            ↓
        Owner/admin alert in CRM
        (no review link — resolve first)
```

> **Owner / Admin:** Configure score threshold and delay before review link in **Settings → Project Stages**.

### Maintenance stage (optional)

For clients with an active retainer after project delivery:

1. Enable **Maintenance** stage in **Settings → Project Stages**
2. Manually move opportunity from Complete → Maintenance
3. Stage appears on stepper and board badges

---

## 11. Calendars

Open **Calendars**.

### Available views

- **Month view** — events for the month; each day shows up to three timed chips; **+N more** opens a scrollable list for that day
- **Upcoming list** — future events in chronological order
- **My calendar** — only your events
- **All calendars** — team events with color per user; color legend at top

Times on chips and in the event detail modal use your **display timezone** (see [My account → Display timezone](#16-my-account)). This matches confirmation emails and Google Calendar when your zone is set correctly.

### Create event

1. Click a date or **New event** button
2. **Required:** title, date/time, linked contact
3. **Location type:**
   - **In person** — shows address field
   - **Google Meet** — auto-generates link if Calendar is connected
   - **Other** — free text field
4. **Assignee** — determines event color on calendar

### Event types and colors

| Type | Color | Source |
|---|---|---|
| Website bookings | Pink | Leads booking from site or chat |
| Internal meetings | Assignee color | Created in CRM by team |
| Client meetings | Assignee color | Kickoff booked inline at end of `/onboarding/[token]` (`customer_meeting`) |

### Automatic reminders

Meetings booked through the CRM (any type) trigger automatic client reminders:
- **24 hours before:** email with date, time, and Meet link (if applicable)
- **1 hour before:** WhatsApp message (if client has phone and enabled)

Both reminders are sent in the contact's **preferred language**.

> **Configure reminders in:** Settings → Automations → Appointment Reminders.

### Booking availability

**Settings → Booking availability** — days, hours, timezone, and duration for website lead booking and the **onboarding kickoff picker** at the end of `/onboarding/[token]`.

> Each member connects their Google Calendar in **Settings → Integrations**.

---

## 12. Conversations

Open **Conversations** — unified WhatsApp and webchat inbox.

### Filter tabs

All · Needs review · WhatsApp · Webchat · Closed

### How AI works

AI (Andrea) handles inbound conversations automatically on both channels:
- Qualifies the lead with specific questions
- Captures name, email, phone, and primary need
- Offers available appointment slots
- Confirms bookings directly on the CRM calendar

When AI determines the lead needs human attention (or when the team decides), the conversation moves to the CRM inbox for manual intervention.

### Manage a conversation

1. Open a thread — messages shown by sender:
   - **Visitor** — left bubble, gray
   - **AI (Andrea)** — right bubble, blue
   - **Human agent** — right bubble, green
   - **System** — center, muted italic text
2. **Take Over** — you take control; reply composer activates
3. **Reply** — WhatsApp via CRM API; webchat writes to thread (visitor sees reply in chat)
4. **Hand Back to Andrea** — return control to AI; automation resumes

The qualification sidebar shows: lead temperature (Hot/Warm/Cold), captured fields (name, email, platform, signals), and contact link when one exists.

> **Sales:** Can take over and reply.
>
> **Viewer:** Cannot take over or reply.
>
> **Owner / Admin:** Can **delete** conversations (messages cascade-delete). Sales cannot delete conversations.

---

## 13. Service tickets

Open **Service Tickets**.

1. **Create ticket** — requires linked contact; set subject, description, tags, and priority
2. **Edit status** — open → in progress → resolved → closed
3. **Gmail thread** — sync and reply to client emails directly from the ticket

When closing a ticket, you can send a **Google review invitation** manually.

> **Owner / Admin:** Can delete tickets. Sales can create and edit but cannot delete.

### Public support widget

Clients use `/support` with their **CID** (assigned when onboarding questionnaire is completed) to submit tickets without logging into the CRM.

The CID is assigned automatically when the client completes the onboarding questionnaire. The client receives it by email with access credentials.

> **Configure in:** Settings → Support widget — enable, embed code, support group email.

---

## 14. Attachments & Media

### Attachments

**Attachments** (`/attachments`) — files uploaded to Supabase linked to contacts. Upload from the list or contact **Related** tab.

### Media

**Media** (`/media`) — browse workspace Google Drive (shared drives and My Drive).

> **Connect Drive:** Any write-role member (owner, admin, sales) can connect workspace Google Drive from **Media** or **Settings → Integrations**.
>
> **Disconnect Drive:** Owner/admin only.

Available actions:
- Browse folders, upload files, create folders
- Link a Drive file to a contact — creates a document with Google Drive source
- All write-role members can browse, upload, and link

---

## 15. Notifications

Click the **bell** in the header. The panel **closes when you click outside** it. **Clear all** removes every notification immediately (no confirmation dialog).

### Notification types

| Type | When it appears |
|---|---|
| Website lead | New lead from form or chat |
| Quote accepted | Client accepted quote |
| Quote rejected | Client rejected quote |
| Invoice paid | Payment received (manual or Stripe) |
| Conversation needs review | AI flagged for human intervention |
| Task overdue | Task past due date |
| Support ticket | New client or widget ticket |
| Project stage changed | Opportunity advanced stage |
| Project completed | Project marked Complete |
| Feedback received | Client submitted feedback form |
| Negative feedback | Alert — rating below threshold |
| Onboarding started | N8N started onboarding flow |
| Onboarding kickoff booked | Client scheduled kickoff at end of `/onboarding/[token]` (sales group alerted) |

### Preferences

**My account → Notifications** — toggle each in-app alert type and email digest frequency.

Configurable groups (owner/admin in Settings):
- **Sales group** — leads, quotes, paid invoices
- **Support group** — new tickets and updates

---

## 16. My account

Open **My account** (`/account`).

| Section | Purpose |
|---|---|
| Profile | Name, email, profile photo |
| **Display timezone** | How calendar, timelines, and CRM dates/times are shown (`Use device timezone` or a fixed region) |
| Password | Change password (current password required) |
| Email signature | HTML signature appended in Gmail composer |
| Notifications | Per-type toggles and email digest |
| Currency | Display preference in finances |

All roles can edit their account. Viewers only update profile and password.

**Display timezone tips:**
- Choose **US Central** or **Mexico City** if you work in CST/CDT and want calendar chips to match client confirmation emails.
- **Use device timezone** follows your laptop or phone clock when you travel.
- A live preview shows the current time in your selected zone before you leave the page.

---

## 17. Settings (workspace)

Open **Settings** (`/settings`).

### All write-role members

| Section | Purpose |
|---|---|
| Email templates | Create, edit, delete |
| Google review invitations | Review URL + email template |
| Booking availability | Time slots for website leads |
| Integrations | Connect your Gmail and Google Calendar |

### Owner / admin only

| Section | Purpose |
|---|---|
| Platform language | CRM UI in English / Spanish |
| Custom fields | Extra fields on contacts, opportunities, tickets |
| Audit log | Full workspace change history |
| Team | Invites and roles (Owner, Admin, Sales, Viewer) |
| Duplicate contacts | Scan, merge, dismiss |
| Website leads | Default assignment, email alert |
| Support widget | Public widget, embed code, support group email |
| Admin integrations | N8N, Stripe, Mailgun, GA4, Google OAuth — status and config |
| Automations → Webhooks | Register N8N URL, select events, delivery log |
| Automations → Onboarding | Enable/disable, trigger, task template, reminders |
| Automations → Appointment Reminders | 24h and 1h email and WhatsApp reminders |
| Automations → Customer Meeting | Availability and config for project meetings |
| Project Stages | Stage labels, maintenance stage, feedback threshold, review delay |
| Finances | Currency, tax, invoice prefix, due days, footer |
| Session timeout | Idle timeout before sign-out (viewers always 1 hour) |
| Quote branding | Logo, colors, fonts for quote and invoice PDFs |

### Team roles

| Role | Capabilities |
|---|---|
| **Admin** | Full settings except removing owner; deletes and high-risk actions |
| **Sales** | Full CRM write (contacts, quotes, invoices, payments, project stages, Drive); limited settings (templates, booking); **no** delete records, expenses, or admin settings |
| **Viewer** | Read-only demo — all write actions blocked |

---

## 18. Customer-facing pages

These pages are sent to clients by email via N8N automations. **Each page language follows the contact's preferred language**, not the workspace language.

| Page | URL | When sent | Who sends |
|---|---|---|---|
| Quote acceptance | `/quote/[token]` | When quote is sent | Sales team (manual) |
| Onboarding questionnaire | `/onboarding/[token]` | When onboarding starts | N8N automatic |
| Kickoff booking | Inline on `/onboarding/[token]` (date + time calendar) | After questionnaire | Customer self-serve |
| Day 14 feedback | `/feedback/[token]` | 14 days after kickoff | N8N automatic |
| Project feedback | `/project-feedback/[token]` | When project marked Complete | N8N automatic |
| Support | `/support` | Link in CID emails and communications | Always available |

### Page flow in the lifecycle

```
Quote sent
    → Client opens /quote/[token] → accepts

Onboarding starts
    → Client receives /onboarding/[token] → completes questionnaire → picks kickoff date/time on same page
    → Day 14: client receives /feedback/[token] → onboarding feedback

Project Complete
    → Client receives /project-feedback/[token] → project feedback
    → If positive → Google review link (24h later)

Anytime
    → Client uses /support with CID → opens support ticket
```

> **Owner / Admin:** Automations are configured in **Settings → Automations**. For N8N flow details, see `docs/n8n/automations-setup-guide.md`.

---

## 19. Troubleshooting

| Problem | What to check |
|---|---|
| Cannot send email | Settings → Integrations — connect Gmail |
| Calendar sync fails | Connect Google Calendar; event still saves in CRM |
| Calendar time looks wrong | **My account → Display timezone** — pick your region (e.g. US Central); not the browser default if you work remotely |
| Empty web analytics | GA4 property + service account in Admin integrations |
| Missing Pay Now on quote | Stripe keys in Integrations; quote with payments enabled |
| Inbound email not syncing | Mailbox that sent the thread must be connected with read permission |
| Viewer cannot edit | Expected — viewer is read-only |
| Google SSO blocked | Viewers use password; SSO only for `@clickin360.com` |
| Drive won't connect | Verify write-role access (sales+); reconnect after OAuth changes |
| Onboarding didn't start | Verify quote is **accepted** AND invoice is **paid** — both required |
| Google review didn't arrive | Feedback form must rate ≥ threshold in Project Stages; check webhook log in Settings → Automations |
| Appointment reminders missing | Verify Appointment Reminders enabled in Settings → Automations |
| Project stage won't advance | Verify contact is **Active** and role has write access (sales+); viewers cannot advance |
| Cannot delete a record | Only owner/admin can delete contacts, opportunities, tickets, and conversations |
| Client CID not assigned | Client must complete onboarding questionnaire at `/onboarding/[token]` |
| Project feedback didn't arrive | Project must be **Complete** stage; check `project.completed` webhook log |
| Client sees expired quote page | Extend due date from quote detail (owner/admin) |

For API and deployment, see [CRM-FEATURES.md](../CRM-FEATURES.md) and [AUTH-ROADMAP.md](../AUTH-ROADMAP.md).

---

*ClickIn 360 CRM — internal manual for owners, admins, and sales team.*
*Version 2026-06-15*
