# N8N flow updates — Conversations inbox

Source workflow JSON files are **not** stored in this repo. Export the current flows from N8N before applying changes, then import the updated JSON after editing.

## Credential

All new HTTP Request nodes use the existing **CRM API** header auth credential:

```json
{ "id": "avN9SN9QlpkztmyC", "name": "CRM API" }
```

Header name: **`x-website-secret`** (existing N8N **CRM API** credential — same as booking/webchat lead endpoints).

Value must match production **`WEBSITE_LEADS_API_SECRET`**. Optionally also accepts `x-n8n-secret` if you set **`N8N_CRM_WEBHOOK_SECRET`**.

Set `continueOnFail: true` on all sync/session-state nodes.

## Troubleshooting 401 Unauthorized

1. **Deploy the inbox code first** — until production includes `/api/integrations/conversations/*` and the middleware exemption in `lib/api/workspace-guards.ts`, POST requests return `401` before the route handler runs.

2. **Verify the N8N credential** — open **CRM API** in N8N → Header Auth → name must be `x-website-secret`, value must exactly match VPS `.env.local` → `WEBSITE_LEADS_API_SECRET`.

Test after deploy:

```bash
curl -sS -X POST "https://www.clickin360.com/api/integrations/conversations/session-state" \
  -H "Content-Type: application/json" \
  -H "x-website-secret: YOUR_SECRET" \
  -d '{"session_id":"test","channel":"whatsapp"}'
```

Expected: `{"handler":"ai","conversation_id":null,"human_review_requested":false}`

## Endpoints

| Node | Method | URL |
|------|--------|-----|
| CRM: Check Session State | POST | `https://www.clickin360.com/api/integrations/conversations/session-state` |
| CRM: Sync Inbound Only | POST | `https://www.clickin360.com/api/integrations/conversations/sync` |
| CRM: Sync Turn | POST | `https://www.clickin360.com/api/integrations/conversations/sync` |
| CRM: Sync Human Review | POST | `https://www.clickin360.com/api/integrations/conversations/sync` |
| CRM: Get Booking Offers | GET | `https://www.clickin360.com/api/leads/booking-offers?lang=es&reschedule=…` |
| CRM: Book Appointment | POST | `https://www.clickin360.com/api/leads/bookings` |

## Webchat — 4 new nodes only

**Required fix:** After CRM session-state nodes, insert **Pass Session Context** (code node) on the AI branch so **Lookup Lead Session** receives the normalize payload again (`session_id`, etc.). Also set lookup filter `condition: eq` and change **Session Exists?** to check `$json.session_id` (not `$json.id`). The patch script applies all of this automatically.

1. **CRM: Check Session State** — after normalize, before session lookup
2. **CRM: Human Handler Branch** — IF `handler === 'human'`
   - true → **CRM: Sync Inbound Only** → **Respond to Webhook** (200 empty)
   - false → existing `Session Exists?`
3. **CRM: Sync Turn** — parallel branch from last Supabase session write (after State Manager path)

Do **not** modify any other webchat nodes.

## WhatsApp — GHL replacement + 4 session/sync nodes

Same session-state / human branch / sync pattern using `Normalize WABA Payload` and `channel: 'whatsapp'`.

**Replace GHL nodes:**

| Remove (HighLevel) | Replace with |
|--------------------|--------------|
| Get free slots of a calendar | CRM: Get Booking Offers |
| Book: Create a contact + opportunity + Add Notes | CRM: Book Appointment |
| Human Review: contact + opportunity + Create a task | CRM: Sync Human Review |

Update **Format Available Slots** to match CRM booking-offers response (mirror webchat flow).

After edits, search the workflow JSON for `highLevel` / `HighLevel` — must be zero matches.

## Validation checklist

- [ ] Valid JSON
- [ ] Existing node IDs unchanged
- [ ] New nodes have fresh UUIDs
- [ ] Webchat: exactly 4 new nodes
- [ ] WhatsApp: zero GHL references
- [ ] `continueOnFail: true` on new HTTP nodes
- [ ] Connections match spec in `docs/WHATSAPP-WEBCHAT-INBOX-PROPOSAL.md`

Full node JSON templates are in the implementation spec (Part 4).

## Generated files

After placing source exports in this folder, run:

```bash
node scripts/patch-n8n-conversations-flows.mjs
```

This produces import-ready workflows:

- `ClickIn360_Web_Chat_Qualification_Flow_Updated.json` — 5 new nodes (session-state, human branch, sync inbound, sync turn, human respond)
- `ClickIn360_Whatsapp_Flow_Updated.json` — GHL removed; CRM booking + conversation sync nodes added

Re-run the script whenever you replace the source exports.
