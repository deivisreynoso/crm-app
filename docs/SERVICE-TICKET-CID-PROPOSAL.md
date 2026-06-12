# Service Ticket Widget + CID System (Architecture Proposal)

**Status:** Awaiting approval — do not implement until reviewed.  
**Iteration:** CRM Enhancement Sprint 2, Task 6  
**Constraint:** No changes to existing authentication logic.

---

## Recommendation: Extend existing `/tickets` — do not create a new top-level object

The CRM already has a mature **Service Tickets** module (`/tickets`, `tickets` table, Gmail threads, contact linkage). The website widget should **create tickets in this table**, not a parallel object.

| Approach | Verdict |
|----------|---------|
| New top-level “Support Tickets” object | ❌ Duplicates `/tickets` |
| Tab on contact record only | ❌ Hides queue from team inbox |
| **Public widget → `tickets` row + contact match via CID** | ✅ Recommended |

---

## Customer Identification Number (CID)

### Storage

Add to `contacts`:

```sql
ALTER TABLE contacts ADD COLUMN customer_id TEXT;
CREATE UNIQUE INDEX idx_contacts_customer_id
  ON contacts (user_id, lower(customer_id))
  WHERE customer_id IS NOT NULL;
```

- **Format:** `CID-YYYY-#####` (sequential per workspace) or UUID short code — generated when contact status moves to `active` (onboarding complete) or manually by admin.
- **Assignment:** Owner/admin action on contact detail (“Generate CID”) + optional auto on onboarding workflow.

### Validation API (public)

```
POST /api/public/support/validate-cid
Body: { "customer_id": "CID-2026-00042" }
Response (always generic on failure): { "valid": true } | { "valid": false, "error": "Unable to verify customer ID." }
```

- Constant-time comparison; rate limit by IP.
- **Never** return “CID not found” vs “invalid format” differently to callers.

### Ticket submission API (public, after CID session)

```
POST /api/public/support/tickets
Headers: x-support-session: <token from validate step>
Body: { subject, description, priority, attachments[] }
```

Session token: short-lived JWT or opaque token stored server-side linking `contact_id` + `workspace_owner_id`.

---

## Website UX

1. **Dedicated page:** `/support` (marketing layout) or embeddable iframe widget.
2. Step 1: CID entry only.
3. Step 2: Ticket form (subject, description, priority, optional attachment).
4. Confirmation: ticket reference (`service_ticket_number` or `id` prefix) + email via Mailgun.

---

## CRM UX

- Tickets appear in existing **`/tickets`** list (filter: source = `website_widget`).
- Contact detail **Related** panel already shows tickets — no new tab required.
- Optional badge on ticket: “Customer portal”.

---

## Settings (Admin/Owner only)

Under **Settings → Integrations → Support widget**:

- Embed code snippet (`<iframe src="{APP_URL}/support?embed=1">`)
- Default assignee for widget tickets
- Enable/disable widget

API: `GET/PATCH /api/settings/support-widget` with `requireWorkspaceManage`.

---

## Permissions

| Action | Roles |
|--------|-------|
| View/respond/close tickets | All (existing ticket permissions) |
| Configure widget | Owner/admin |
| Generate CID on contact | Owner/admin/sales (write) |

---

## Email confirmation

On successful submit:

- Mailgun to contact email: subject “Ticket #{number} received”, body with reference + SLA copy.
- Uses existing `lib/email/send.ts`.

---

## Open questions

1. Auto-generate CID on contact `status = active`, or manual only?
2. Allow ticket submit without CID for prospects (marketing) — spec says no.
3. Attachment size limit (align with documents storage: 10MB)?

---

*Prepared for review — no implementation until approved.*
