# ClickIn 360 — Automations setup guide

Step-by-step setup for CRM outbound webhooks → N8N router → onboarding & appointment workflows.

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

| Location | Variable / field |
|----------|------------------|
| **CRM VPS** `.env.local` | `CRM_OUTBOUND_WEBHOOK_SECRET=your-secret-here` |
| **CRM UI** Settings → Automations → Webhooks → Webhook secret | Same value (optional if env is set) |
| **N8N** Router workflow → **Validate Secret** code node | Compare against `{{$env.CRM_OUTBOUND_WEBHOOK_SECRET}}` |

Restart the CRM app after changing `.env.local`.

### What it does

When the CRM fires an event, it POSTs to your N8N router URL with header:

```
x-crm-webhook-secret: your-secret-here
```

N8N rejects requests without the correct secret.

---

## 2. CRM router URL (paste into Settings)

1. Import **`ClickIn360_CRM_Event_Router.json`** into N8N and **activate** it.
2. Open the **CRM Router Webhook** node → copy the **Production URL**.
   - Path UUID: `b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e`
   - Example: `https://n8n.clickin360.com/webhook/b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e`
3. In CRM: **Settings → Automations → Webhooks**
   - **Webhook URL** = that Production URL
   - **Webhook secret** = your `CRM_OUTBOUND_WEBHOOK_SECRET`
   - Enable all events (or select individually)
   - **Save**

---

## 3. N8N environment variables

Set these in N8N → Settings → Variables (or instance `.env`):

| Variable | Example | Used for |
|----------|---------|----------|
| `CRM_BASE_URL` | `https://www.clickin360.com` | Links in emails |
| `CRM_OUTBOUND_WEBHOOK_SECRET` | (same as CRM) | Router validation |
| `N8N_WEBHOOK_BASE` | `https://n8n.clickin360.com/webhook` | Router forwards to sub-workflows |
| `GOOGLE_REVIEWS_URL` | Your Google review link from CRM Settings | Advocacy workflow emails |
| `BOOKING_OFFERS_URL` | `https://www.clickin360.com/api/leads/booking-offers?lang=es` | Kickoff scheduling link |

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

| File | Role |
|------|------|
| `ClickIn360_CRM_Event_Router.json` | **Main entry** — paste URL into CRM Settings |
| `ClickIn360_Onboarding_A_Kickoff.json` | Quote+invoice gate, welcome email, kickoff link |
| `ClickIn360_Onboarding_B_Assets_Reminders.json` | Questionnaire confirmation + Day 1/3 reminders |
| `ClickIn360_Onboarding_C_Advocacy.json` | Google review + feedback link on completion |
| `ClickIn360_Appointment_Reminders.json` | 24h + 1h appointment reminders |

After import, re-link credentials on every HTTP/Mailgun/Supabase/WhatsApp node if N8N prompts you.

### Credentials (reuse existing)

| Name | Purpose |
|------|---------|
| **CRM API** | Header `x-website-secret` = `WEBSITE_LEADS_API_SECRET` |
| **Supabase account** | ClickIn360 project (onboarding_runs, reminder_schedules) |
| **Mailgun** | Customer emails |
| **WhatsApp account** | Optional WhatsApp reminders |

---

## 6. Advocacy vs CRM “Request review” — are they the same?

**Same Google review link. Different trigger and sender.**

| | CRM “Request review” button | Advocacy workflow (N8N) |
|--|------------------------------|-------------------------|
| **Trigger** | You click it manually on a contact or closed ticket | Automatic on `onboarding.complete` webhook |
| **Sender** | Connected user’s Gmail or CRM Mailgun | N8N Mailgun node |
| **Template** | Settings → Google review invitation template | N8N builds email using `GOOGLE_REVIEWS_URL` env var |
| **Opt-out** | Respects `review_request_opt_out` on contact | Should add IF node checking opt-out via CRM API payload |
| **Activity log** | Logged in CRM contact timeline | Not logged unless you add a CRM integration call |
| **When to use** | One-off after support ticket, ad-hoc ask | Standard end-of-onboarding automation |

**Recommendation:** Keep both. Use CRM button for manual/exception cases. Use Advocacy workflow as the default automated ask after onboarding completes.

The old Advocacy stub called `/api/contacts/.../review-request` — **that route does not exist** and requires a logged-in user. The updated workflow sends Mailgun directly with your Google review URL (same link configured in **Settings → Google review invitations**).

---

## 7. Event routing map

```
CRM fireWebhook()
        │
        ▼
┌───────────────────────────┐
│ CRM Event Router (N8N)    │
└───────────────────────────┘
        │
        ├─ quote.accepted ──────────────► Onboarding A (store quote_accepted)
        ├─ invoice.paid ────────────────► Onboarding A (check gate → kickoff)
        ├─ onboarding.manual_start ─────► Onboarding A (skip gate)
        ├─ questionnaire.submitted ───────► Onboarding B
        ├─ onboarding.complete ───────────► Onboarding C
        ├─ appointment.created ─────────► Appointment Reminders
        ├─ appointment.updated ─────────► Appointment Reminders (reschedule)
        └─ appointment.cancelled ───────► Appointment Reminders (cancel waits)
```

---

## 8. Test checklist

1. **Secret test** — Send test POST from terminal:

```bash
curl -sS -X POST "YOUR_ROUTER_PRODUCTION_URL" \
  -H "Content-Type: application/json" \
  -H "x-crm-webhook-secret: YOUR_SECRET" \
  -d '{"event":"onboarding.manual_start","workspace_owner_id":"test","emitted_at":"2026-01-01T00:00:00Z","payload":{"contact_id":"test","contact":{"email":"you@example.com","first_name":"Test"}}}'
```

2. **CRM delivery log** — Supabase `webhook_deliveries` table after a real quote accept.
3. **Onboarding** — Accept quote → pay invoice → verify welcome email.
4. **Manual** — Contact detail → **Start onboarding** → link copied.
5. **Appointments** — Create event 26h ahead → check `appointment_reminder_schedules` row in Supabase.

---

## 9. Troubleshooting

| Problem | Fix |
|---------|-----|
| No webhooks in N8N | Webhook URL empty in CRM Settings; workflow not active |
| 401 / rejected | Secret mismatch between CRM and N8N |
| Onboarding never starts | `quote.accepted` alone is not enough — wait for `invoice.paid` or use manual start |
| Review email wrong link | Set `GOOGLE_REVIEWS_URL` in N8N to match CRM Settings |
| Reminders not sent | Use N8N **Wait** nodes (not Sleep); workflow must stay active |

---

## 10. Per-node instructions

Each imported workflow includes **yellow sticky notes** on the canvas explaining what that section does and what to verify after import. Open the workflow in N8N and read stickies left-to-right before activating.
