# ClickIn 360 — Automations setup guide

Step-by-step setup for CRM outbound webhooks → N8N router → onboarding & appointment workflows.

**Target:** self-hosted **n8n Community Edition** (free). This guide does **not** use **Settings → Variables** (Enterprise-only).

---

## 1. Where does `CRM_OUTBOUND_WEBHOOK_SECRET` come from?

**You create it.** It is not issued by Google, Stripe, or N8N. It is a shared password between your CRM and N8N.

### Generate a secret (pick one)

```bash
# macOS / Linux
openssl rand -hex 32
```

Or use a password manager to generate a 32+ character random string.

### Set it in two places (must match exactly)


| Location                                                                                         | Where to paste                                 |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| **CRM VPS** `.env.local`                                                                         | `CRM_OUTBOUND_WEBHOOK_SECRET=your-secret-here` |
| **CRM UI** Settings → Automations → Webhooks → Webhook secret                                    | Same value (optional if env is set)            |
| **N8N** Router workflow → **Config: Edit These Values** Set node → `crm_outbound_webhook_secret` | Same value                                     |


Restart the CRM app after changing `.env.local`.

### What it does

When the CRM fires an event, it POSTs to your N8N router URL with header:

```
x-crm-webhook-secret: your-secret-here
```

The Router workflow rejects requests without the correct secret.

---

## 2. Configuration on n8n Community Edition (no UI Variables)

The free Community plan does **not** include **Settings → Variables**. Use one of these approaches:

### Recommended: **Config: Edit These Values** Set node (built into every workflow)

Each imported workflow has a **Set** node named **Config: Edit These Values** immediately after the Webhook. Open it and edit the string fields — no code, no Enterprise license.


| Field                         | Workflows             | Example value                                                 |
| ----------------------------- | --------------------- | ------------------------------------------------------------- |
| `crm_outbound_webhook_secret` | Router only           | Same secret as CRM                                            |
| `n8n_webhook_base`            | Router only           | `https://n8n.yourdomain.com/webhook` (no trailing slash)      |
| `crm_base_url`                | A, B, C, Appointments | `https://www.clickin360.com`                                  |
| `booking_offers_url`          | Onboarding A          | `https://www.clickin360.com/api/leads/booking-offers?lang=es` |
| `google_reviews_url`          | Onboarding C          | Your Google review link from CRM Settings                     |


**After import:** open each workflow → click **Config: Edit These Values** → replace placeholder values → Save → Activate.

### Optional alternative: Docker / OS environment variables

Self-hosted n8n **can** read process env vars via `$env.NAME` in expressions, but our workflow JSONs use the **Config Set node** instead so you do not need this. If you prefer env vars, set them on the n8n container:

```yaml
# docker-compose.yml (optional — not required with Config nodes)
services:
  n8n:
    environment:
      - CRM_BASE_URL=https://www.clickin360.com
      - CRM_OUTBOUND_WEBHOOK_SECRET=your-secret
      - N8N_WEBHOOK_BASE=https://n8n.yourdomain.com/webhook
      - GOOGLE_REVIEWS_URL=https://share.google/your-link
```

You would then need to change expressions in workflows from `$json.crm_base_url` to `$env.CRM_BASE_URL` manually. **Stick with Config nodes unless you have a reason to use Docker env.**

---

## 3. CRM router URL (paste into Settings)

1. Import `**ClickIn360_CRM_Event_Router.json`** into N8N.
2. Open **Config: Edit These Values** → set `crm_outbound_webhook_secret` and `n8n_webhook_base`.
3. **Activate** the workflow.
4. Open **CRM Router Webhook** → copy the **Production URL**.
  - Path UUID: `b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e`
  - Example: `https://n8n.yourdomain.com/webhook/b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e`
5. In CRM: **Settings → Automations → Webhooks**
  - **Webhook URL** = that Production URL
  - **Webhook secret** = same value as Config node
  - Enable all events (or select individually)
  - **Save**

---

## 4. Supabase tables (ClickIn360 N8N project)

Run in the **ClickIn360** Supabase project (same DB your WhatsApp/webchat flows use — **not** `crm-prod`):

```sql
CREATE TABLE IF NOT EXISTS onboarding_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  contact_id TEXT NOT NULL,
  document_id TEXT,
  workspace_owner_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  quote_accepted_at TIMESTAMPTZ,
  invoice_paid_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_reminder_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  contact_id TEXT,
  workspace_owner_id TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  reminder_24h_at TIMESTAMPTZ,
  reminder_1h_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  locale TEXT DEFAULT 'es',
  meet_link TEXT,
  location_type TEXT,
  location_details TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_name TEXT,
  sent_24h_at TIMESTAMPTZ,
  sent_1h_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 5. Import workflow files (order)

Import and **activate** all five workflows from `docs/n8n/`:


| File                                            | Config fields to edit                             | Role                                           |
| ----------------------------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| `ClickIn360_CRM_Event_Router.json`              | `crm_outbound_webhook_secret`, `n8n_webhook_base` | **Main entry** — paste Production URL into CRM |
| `ClickIn360_Onboarding_A_Kickoff.json`          | `crm_base_url`, `booking_offers_url`              | Quote+invoice gate, welcome email              |
| `ClickIn360_Onboarding_B_Assets_Reminders.json` | `crm_base_url`                                    | Questionnaire confirmation                     |
| `ClickIn360_Onboarding_C_Advocacy.json`         | `crm_base_url`, `google_reviews_url`              | Google review on completion                    |
| `ClickIn360_Appointment_Reminders.json`         | `crm_base_url`                                    | 24h + 1h reminders                             |


### Per-workflow checklist (Community Edition)

For **each** workflow after import:

1. Open workflow in N8N editor
2. Click **Config: Edit These Values** (second node after Webhook)
3. Replace placeholder strings with your real values
4. Re-link credentials if prompted (**CRM API**, **Supabase account**, **Mailgun**, **WhatsApp account**)
5. Read yellow sticky notes on canvas
6. **Save** → toggle **Active**

### Credentials (reuse existing)


| Name                 | Purpose                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| **CRM API**          | Header `x-website-secret` = `WEBSITE_LEADS_API_SECRET`                   |
| **Supabase account** | ClickIn360 project (`onboarding_runs`, `appointment_reminder_schedules`) |
| **Mailgun**          | Customer emails                                                          |
| **WhatsApp account** | Optional WhatsApp reminders                                              |


---

## 6. Advocacy vs CRM “Request review” — are they the same?

**Same Google review link. Different trigger and sender.**


|                  | CRM “Request review” button                         | Advocacy workflow (N8N)                           |
| ---------------- | --------------------------------------------------- | ------------------------------------------------- |
| **Trigger**      | You click it manually on a contact or closed ticket | Automatic on `onboarding.complete` webhook        |
| **Sender**       | Connected user’s Gmail or CRM Mailgun               | N8N Mailgun node                                  |
| **Review link**  | Settings → Google review invitations                | **Config node** → `google_reviews_url` (same URL) |
| **Opt-out**      | Respects `review_request_opt_out` on contact        | Workflow checks opt-out before sending            |
| **Activity log** | Logged in CRM contact timeline                      | Not logged unless you add integration calls       |
| **When to use**  | One-off after support ticket, ad-hoc ask            | Standard end-of-onboarding automation             |


**Recommendation:** Keep both. Set `google_reviews_url` in Advocacy Config to match **Settings → Google review invitations** in CRM.

---

## 7. Event routing map

```
CRM fireWebhook()
        │
        ▼
┌───────────────────────────┐
│ CRM Event Router (N8N)    │  ← Config: secret + n8n_webhook_base
└───────────────────────────┘
        │
        ├─ quote.accepted ──────────────► Onboarding A
        ├─ invoice.paid ────────────────► Onboarding A
        ├─ onboarding.manual_start ─────► Onboarding A
        ├─ questionnaire.submitted ─────► Onboarding B
        ├─ onboarding.complete ─────────► Onboarding C
        ├─ appointment.created ─────────► Appointment Reminders
        ├─ appointment.updated ─────────► Appointment Reminders
        └─ appointment.cancelled ───────► Appointment Reminders
```

Sub-workflows receive the same JSON body the CRM sent to the router.

---

## 8. Smoke tests (CRM UI only)

Use these steps the way a real user would — **no curl, no terminal**. Log in as **Owner** or **Admin**. Use a dedicated **test contact** with your real email so you can confirm messages arrive.

### Before you start

1. **Settings → Automations → Webhooks** — webhook URL and secret saved; events enabled.
2. All five n8n workflows **Active**, Config nodes edited (see §5).
3. Optional for admins: keep n8n **Executions** open in another tab to confirm green runs.

### What “pass” looks like (without Supabase)

| You should see… | Where |
|-----------------|--------|
| Welcome / confirmation / review emails | Your inbox (test contact email) |
| Onboarding tasks on the contact | Contact detail → Tasks |
| “Onboarding link copied” toast | After **Start onboarding** |
| Calendar event saved | Calendar module |
| Sales group email (if configured) | `sales@clickin360.com` inbox on quote accept / lead events |

Admins can also confirm in n8n → **Executions** that the Router and sub-workflow ran (green).

---

### Test 1 — Manual onboarding kickoff (fastest first test)

**CRM path:** Contacts → open test contact → **Start onboarding**

1. Click **Start onboarding** on the contact detail page.
2. Confirm toast: onboarding link copied.
3. Open contact **Tasks** — new onboarding checklist tasks should appear.
4. Check test contact **email** — welcome email with questionnaire + booking links.
5. In n8n → **ClickIn360 CRM Event Router** → latest execution should be green, then **Onboarding A**.

**Pass:** Tasks created, welcome email received, n8n Router + A succeeded.

---

### Test 2 — Customer accepts a quote (no kickoff yet)

**CRM path:** Quotes → send quote → customer accepts on public page

1. Create a quote for the test contact.
2. **Send via Gmail** (quote status becomes `sent`).
3. Open the public quote link (`/quote/...`) in a private/incognito window (or as the customer).
4. Click **Accept** and complete the form.
5. Check **sales@clickin360.com** (or sales group inbox) — quote accepted notification.
6. In n8n → Router + **Onboarding A** should run, but **no welcome email yet** (invoice not paid).

**Pass:** Quote shows accepted in CRM; sales notified; n8n A records quote accepted only.

---

### Test 3 — Invoice paid completes onboarding kickoff

**CRM path:** Finances → invoice → record payment

Do this **after Test 2** on the same contact/quote.

**Option A — Manual payment (CRM UI):**

1. Go to **Finances → Invoices** → open the invoice linked to the accepted quote.
2. Log a **manual payment** for the full balance.
3. Invoice status becomes **paid**.

**Option B — Stripe payment link:**

1. Send payment link from the invoice (or use **Pay Now** if configured).
2. Complete checkout as the customer in Stripe test/live mode.

**Then verify:**

1. Test contact email — **welcome / onboarding email** (if not already sent via Test 1).
2. n8n → Router + **Onboarding A** green again.
3. Sales group inbox — invoice paid notification.

**Pass:** `invoice.paid` path fires; onboarding kickoff email sent (if not duplicate from Test 1).

---

### Test 4 — Onboarding questionnaire (customer-facing)

**CRM path:** Use link from Test 1 or Test 3

1. Open the onboarding URL (`/onboarding/...`) from the welcome email or copied link — use incognito.
2. Fill out the questionnaire (business name, platform, etc.).
3. Submit the form.
4. Test contact email — **confirmation** (“we received your questionnaire”).
5. `sales@clickin360.com` — owner notification email.
6. n8n → **Onboarding B** green; then **Onboarding C** (review request).

**Pass:** Confirmation email + Google review email received; n8n B and C succeeded.

---

### Test 5 — Google review (advocacy vs manual button)

**Automatic (from Test 4):** Review email should arrive from **Onboarding C** with your Google review link.

**Manual (separate check):** Contacts → test contact → **Request review** — sends via CRM (Gmail/Mailgun), logged on contact timeline. Same review link, different sender — both are valid.

**Pass:** Automatic review email after questionnaire; manual button still works if you test it once.

---

### Test 6 — Appointment reminders

**CRM path:** Calendar → create event for test contact

1. Go to **Calendar**.
2. **Create event** linked to test contact, **~1–2 days from now** (so 24h reminder can fire).
3. Set location to **Google Meet** (or in person with address).
4. Save the event.
5. n8n → Router + **Appointment Reminders** — execution should be green.
6. **Optional:** Reschedule the event (change start time) → n8n should run again (`appointment.updated`).
7. **Optional:** Delete the event → n8n runs (`appointment.cancelled`).

**Pass:** Each calendar action triggers a green n8n Appointments run. Reminder emails arrive at 24h and 1h before start (wait for real time, or check n8n Wait nodes are scheduled).

**Short event test:** Create an event **30 minutes from now** — reminders should be skipped (nothing to wait for).

---

### Test 7 — Feedback form (optional)

**CRM path:** Open feedback link from onboarding completion

1. Open `/feedback/...` link (from advocacy email or contact record if you have access).
2. Submit a low score (e.g. 2 stars) and comments.
3. Workspace owner should get an **in-app notification** (and email if configured).

**Pass:** Feedback saved; owner alerted on low scores.

---

### Full sign-off checklist (CRM UI)

Run in order on one test contact:

- [ ] **Settings → Automations** — webhooks configured and saved
- [ ] **Start onboarding** — tasks + welcome email
- [ ] **Send & accept quote** — sales notified, no welcome until paid
- [ ] **Pay invoice** (manual or Stripe) — welcome / kickoff completes
- [ ] **Submit onboarding form** — confirmation + review emails
- [ ] **Create calendar event** — n8n Appointments runs
- [ ] **Reschedule or delete event** — n8n runs again
- [ ] All expected emails received in real inboxes
- [ ] n8n Executions green for Router, A, B, C, and Appointments

---

## 9. Troubleshooting (Community Edition)


| Problem                                       | Fix                                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| No **Variables** in N8N Settings              | Expected on Community — use **Config: Edit These Values** Set nodes                      |
| `Invalid x-crm-webhook-secret` / secret error | See **Secret troubleshooting** below                                                     |
| No webhooks in N8N                            | Router workflow not **Active**; wrong Production URL in CRM                              |
| Forward fails to sub-workflows                | `n8n_webhook_base` wrong in Router Config (must match your instance, include `/webhook`) |
| Onboarding never starts                       | `quote.accepted` alone waits for `invoice.paid` — or use manual **Start onboarding**     |
| Review email wrong link                       | Edit `google_reviews_url` in Onboarding C Config node                                    |
| Reminders not sent                            | Workflows must stay **Active**; uses **Wait** nodes (not Sleep)                          |
| Config changes not applied                    | Save workflow after editing Config node, then re-activate                                |


---

## 11. Secret troubleshooting (`Invalid x-crm-webhook-secret`)

The Router reads the header from the **CRM Router Webhook** node (not from the Config node output). Common causes:

### A — Config still has placeholder

Open Router → **Config: Edit These Values** → `crm_outbound_webhook_secret` must **not** be `PASTE_SAME_SECRET_AS_CRM_HERE`.

### B — CRM not sending the header

CRM only sends `x-crm-webhook-secret` when a secret is configured:

1. **CRM Settings → Automations → Webhooks → Webhook secret** — paste your secret and Save
2. **Or** VPS `.env.local` → `CRM_OUTBOUND_WEBHOOK_SECRET=...` and restart the app

If both are empty, CRM sends an empty header and N8N rejects the request.

### C — Secrets do not match

The value must be **identical** in:

- CRM Settings (or `CRM_OUTBOUND_WEBHOOK_SECRET` env)
- N8N Router → Config → `crm_outbound_webhook_secret`

Copy-paste from a password manager; avoid trailing spaces.

### D — Testing from n8n UI only

N8N **Listen for test event** / **Test workflow** does **not** send `x-crm-webhook-secret`. Do not use that to validate the router.

Instead, trigger a real event from the CRM UI (see **§8 Smoke tests**):

1. **Contacts → test contact → Start onboarding** — fastest check that CRM → n8n works end-to-end.
2. If that fails, fix Config secret and CRM Settings before testing quote/invoice flows.

### E — Verify deliveries (admin)

After any CRM UI action in §8, an admin can check Supabase `webhook_deliveries` — `success = true` means CRM reached n8n. If `success = false` and the error mentions secret/auth, re-check §11 A–C.

---

## 10. Per-node instructions

Each workflow includes **yellow sticky notes** on the canvas. They mention the Community Edition Config node pattern. Read stickies left-to-right before activating.

### Config node location in each workflow

```
Webhook  →  Config: Edit These Values  →  (rest of flow)
```

The Config node uses **Include Other Input Fields** so CRM event data (`event`, `payload`, etc.) passes through unchanged while adding your config strings.

**Router only:** the Validate node reads `x-crm-webhook-secret` from **CRM Router Webhook** (headers are not on the Config node output).

---

## 12. Sprint 6 — N8N UPDATE workflow imports

Canonical workflow exports live in `docs/n8n/Automations/` (do not edit in place). For each sprint that changes automation behavior, import-ready copies are written to `docs/n8n/` with **`UPDATE`** appended to the workflow name.

| UPDATE file | Changes |
|-------------|---------|
| `ClickIn360 Onboarding A — Kickoff UPDATE.json` | CRM runs kickoff on `invoice.paid` (close won, contact active, tasks); welcome email links only to `/onboarding/[token]` (booking is inline at end of questionnaire); `*2` path sends Mailgun then logs activity |
| `ClickIn360 Appointment Reminders UPDATE.json` | Docx-style confirmation + 24h + 1h emails (Meet link, reschedule, cancel); **Calculate runs before Mailgun**; parse `body.payload` + `appointment_email` from CRM |
| `ClickIn360 Onboarding B — Assets Reminders UPDATE.json` | `GET /api/contacts/{id}/calendar-events?kind=customer_meeting` — sends booking reminder only when no kickoff meeting exists |
| `ClickIn360 Project Advocacy UPDATE.json` | `PATCH /api/project-feedback/{id}/google-review-sent` after Google review Mailgun |

**Import steps:** n8n → Workflows → Import from file → pick the `UPDATE` JSON → open **Config: Edit These Values** → verify `crm_base_url` → ensure **CRM API** credential (`x-n8n-secret` header) is linked on new HTTP nodes → Save → Activate (replace or deactivate the prior version).

**CRM internal APIs** (N8N auth via `N8N_CRM_WEBHOOK_SECRET` / **CRM API** credential):

- `POST /api/onboarding/kickoff` — body: `{ contact_id, document_id?, invoice_total }` (also invoked automatically from CRM on first `invoice.paid`)
- `PATCH /api/opportunities/close-won` — body: `{ contact_id, document_id, invoice_total }` (legacy; prefer kickoff)
- `POST /api/contacts/{id}/activities` — body: `{ body, type? }`
- `GET /api/contacts/{id}/calendar-events?kind=customer_meeting`
- `PATCH /api/project-feedback/{id}/google-review-sent`

Future database migrations: apply via Supabase MCP (`apply_migration`, project `zidewuotwczkudlmxcda`) — migrations **075–079** shipped with Sprint 6.