# WhatsApp + Webchat — Unified Conversation Inbox (Architecture Proposal)

**Status:** Awaiting approval — do not implement until reviewed.  
**Iteration:** CRM Enhancement Sprint 2, Task 3  
**Constraint:** No changes to existing authentication logic.

---

## Current state (baseline)

| Piece | Today |
|-------|--------|
| **Marketing webchat** | Browser widget → `POST /api/website/chat` (same-origin proxy) → N8N webhook (`N8N_WEBCHAT_WEBHOOK_URL`) |
| **Lead sync** | N8N (or scripts) call `POST /api/leads/webchat` with `x-website-secret` → `createLeadFromWebsite()` creates/updates **contacts**, notes, opportunities |
| **Booking** | `GET /api/leads/booking-offers`, `POST /api/leads/bookings` — CRM calendar + contacts (no GHL) |
| **WhatsApp inbound (scaffolding)** | `GET/POST /api/integrations/whatsapp/inbound` — Meta verify + minimal normalize; no AI, no inbox |
| **N8N inbound (scaffolding)** | `POST /api/integrations/n8n/inbound` — auth + ack only |
| **Session storage** | `lead_sessions` referenced in API docs; **not** in CRM migrations — lives in Supabase outside this repo or N8N-only |
| **Human handoff** | `human_review` in N8N flow only; no CRM UI |

---

## 1. Meta WABA inbound webhook — where it lives

**Recommendation:** Keep a **single CRM endpoint** as Meta’s webhook URL:

```
GET/POST  /api/integrations/whatsapp/inbound
```

| Method | Purpose |
|--------|---------|
| `GET` | Meta subscription verification (`hub.mode`, `hub.verify_token`, `hub.challenge`) — already scaffolded |
| `POST` | Inbound messages + status events |

**Routing inside `POST`:**

1. Verify `X-Hub-Signature-256` (app secret from Meta).
2. Parse Meta payload → normalize to internal `InboundMessage` (`channel`, `external_id`, `from`, `body`, `timestamp`, `raw`).
3. Resolve or create `conversations` row (see §2).
4. Append `conversation_messages` row.
5. Branch:
   - If conversation `handler = human` → notify assigned/team; **do not** call AI.
   - Else → enqueue AI turn (see §3).

**Outbound replies:** New internal helper `sendWhatsAppText(to, body)` using `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` (Graph API `/{phone-number-id}/messages`).

**Why not a separate microservice:** One deploy unit, shared auth for inbox UI, reuse Lead API and calendar code, simpler local testing with ngrok.

---

## 2. Conversation storage — unified model

**Recommendation:** One **`conversations`** table for both WhatsApp and webchat (channel discriminator), plus **`conversation_messages`**.

### `conversations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspace_owner_id` | UUID | Tenant (`WEBSITE_LEADS_USER_ID` / owner) |
| `channel` | `whatsapp` \| `webchat` | |
| `external_session_id` | TEXT | WhatsApp: `wa_id` or phone; webchat: widget `session_id` |
| `contact_id` | UUID nullable FK | Set when lead qualifies |
| `status` | `active` \| `closed` | |
| `handler` | `ai` \| `human` | Takeover toggle |
| `handler_user_id` | UUID nullable | CRM user who took over |
| `human_review_requested` | BOOLEAN | Set when AI returns `next_action = human_review` |
| `language` | TEXT | `en` / `es` |
| `qualification` | JSONB | `name`, `email`, `phone`, `platform`, `signals`, `temperature`, `friction_area`, … |
| `pending_action` | TEXT | `offer_booking`, `confirm_booking`, `ask_contact`, … |
| `booking_state` | JSONB | `available_slots`, `selected_slot_index`, `offered_slots` |
| `last_message_at` | TIMESTAMPTZ | Inbox sort |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

Unique: `(workspace_owner_id, channel, external_session_id)`.

### `conversation_messages`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `conversation_id` | UUID FK | |
| `direction` | `inbound` \| `outbound` | |
| `sender_type` | `visitor` \| `ai` \| `human` \| `system` | |
| `sender_user_id` | UUID nullable | CRM user when human |
| `body` | TEXT | |
| `metadata` | JSONB | AI structured payload, WhatsApp message id |
| `created_at` | TIMESTAMPTZ | |

**Migrate away from `lead_sessions`:** N8N/WhatsApp flows read/write these tables via CRM API instead of direct Supabase on a legacy table.

**Webchat path change:** Widget continues `POST /api/website/chat` but CRM becomes the orchestrator (or CRM proxies to N8N with `conversation_id` — see §3).

---

## 3. N8N orchestrates AI vs CRM calls AI directly

| Approach | Pros | Cons |
|----------|------|------|
| **A. N8N keeps AI; CRM is system of record** | Reuse existing Andrea workflow JSON; change HTTP nodes to CRM conversation APIs + existing Lead API; faster migration | Two runtimes; harder to test inbox + AI in one repo; duplicate session logic risk |
| **B. CRM orchestrates AI (recommended)** | Single source of truth for messages, takeover, booking state; inbox UI trivial; local e2e testable | Port AI agent prompt + routing from N8N into `lib/conversations/agent.ts`; N8N optional for non-chat automation |

**Recommendation: B — CRM orchestrates.**

- `lib/conversations/agent.ts` calls Claude (env `ANTHROPIC_API_KEY`) with persona + history + tools schema matching current N8N output (`reply_to_user`, `next_action`, qualification fields).
- N8N **optional** for outbound automations (`website.lead` webhooks already exist).
- Webchat: widget → `POST /api/website/chat` → CRM agent loop → JSON `{ reply }` (same response shape as today).
- WhatsApp: Meta webhook → same agent loop → `sendWhatsAppText`.

**Tradeoff summary:** Slightly more CRM code now; eliminates dual session stores and makes human takeover reliable.

---

## 4. `offer_booking` / `confirm_booking` → CRM Google Calendar

Already implemented for Lead API — **reuse without GHL:**

| `next_action` | CRM call |
|---------------|----------|
| `offer_booking` | `GET /api/leads/booking-offers?lang=` (internal function `getBookingOffers()`) |
| `reschedule` | Same with `reschedule=true&limit=6` |
| `confirm_booking` | `POST /api/leads/bookings` with `contact_info`, `slot_index`, `offered_slots` |

**Agent layer:**

1. On `offer_booking`, store `booking_state.available_slots` on `conversations`, format numbered reply (3–6 options) in agent response.
2. On user picks `1`/`2`/`3`, set `selected_slot_index` in `booking_state`.
3. On `confirm_booking`, call `bookAppointment()` from `lib/leads/book-appointment.ts` (creates `calendar_events` + contact); uses workspace booking settings and **CRM calendar** (Google sync when owner/assignee has Calendar connected).

No GHL dependency.

---

## 5. Contact / lead creation and matching

**When qualification has email + phone (or minimum required by `createLeadFromWebsite`):**

1. Call existing `createLeadFromWebsite({ source: 'webchat' | channel, contact_info, qualification, conversation_transcript })`.
2. Set `conversations.contact_id` from result.
3. Continue using duplicate detection (email/phone match) already in `lib/leads/website-leads.ts`.

**Partial qualification (`ask_contact`):** Update `conversations.qualification` JSON only; no contact row until valid.

**WhatsApp:** Phone from Meta payload pre-fills `contact_info.phone`; email collected in conversation.

---

## 6. Notifications when `human_review`

On AI response with `next_action = human_review`:

1. Set `conversations.human_review_requested = true`.
2. `createNotification()` for workspace owner + admins (new preference `conversation_review` optional, default on).
3. In-app notification deep link: `/conversations?highlight={conversation_id}`.
4. Optional: Mailgun email to default assignee (`user_settings.default_sales_assignee`) if `email_notifications` enabled.

---

## 7. Human takeover toggle + inbox UI

### API

| Method | Path | Roles |
|--------|------|-------|
| `GET` | `/api/conversations` | All (list active, filter channel/review) |
| `GET` | `/api/conversations/[id]` | All (messages + qualification) |
| `POST` | `/api/conversations/[id]/messages` | All with write (human reply) |
| `POST` | `/api/conversations/[id]/takeover` | All with write — `handler=human`, `handler_user_id=actor` |
| `POST` | `/api/conversations/[id]/release` | Same — `handler=ai`, clear `handler_user_id` |

When `handler=human`, agent loop skips AI; outbound messages sent as `sender_type=human` via WhatsApp API or webchat poll/SSE.

### UI (`/conversations`)

- Left: conversation list (channel badge, preview, `human_review` flag, last activity).
- Right: message thread + qualification sidebar.
- Toolbar: **Take over** / **Hand back to Andrea** + composer.
- All roles can view and take over (per requirements); configuration stays in Settings → Integrations (admin).

### Webchat live updates

Phase 1: short polling on open conversation. Phase 2 (optional): SSE `/api/conversations/[id]/stream`.

---

## Implementation order (after approval)

1. Migrations `052_conversations.sql`
2. Env vars in `.env.local.example` (WhatsApp + Anthropic)
3. Extend WhatsApp inbound webhook + outbound send
4. Agent module + refactor `/api/website/chat`
5. Conversations API + inbox UI
6. Takeover + notifications
7. Wire booking actions through existing Lead API internals
8. Local e2e: Meta test webhook → AI → takeover → book → contact in CRM

---

## Open questions for approval

1. **AI in CRM vs N8N** — confirm option **B** (CRM orchestrates).
2. **Anthropic API key** in CRM env vs keeping Claude node in N8N with CRM as message store only (hybrid).
3. **Webchat transport** — keep polling vs add SSE in v1.
4. **Deprecate `lead_sessions`** — drop external table once N8N workflow is repointed?

---

*Prepared for review — no implementation code until approved.*
