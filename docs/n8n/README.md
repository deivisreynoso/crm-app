# N8N workflow files

Active production flows live in this folder. Import the **`*_Updated.json`** or **`*_Kickoff.json`** files unless noted. Legacy `Final *` and un-suffixed copies are kept for reference only — do not activate duplicates.

Setup steps: see [automations-setup-guide.md](./automations-setup-guide.md).

## Credential IDs (replace after import)

N8N assigns new credential IDs on import. Update every HTTP Request node to use your instance's:

| Credential | Used by |
|------------|---------|
| **CRM API** (Header Auth: `x-n8n-secret` = `N8N_CRM_WEBHOOK_SECRET`) | All inbound CRM API nodes |
| **Mailgun** | Outbound email nodes |
| **WhatsApp Business** | WhatsApp send nodes (unchanged from prior flows) |
| **Google Drive** | Onboarding B folder creation |

## Flow index

| File | Purpose | CRM triggers / entry |
|------|---------|----------------------|
| `ClickIn360_CRM_Event_Router.json` | Routes outbound CRM webhooks (`x-crm-webhook-secret`) to child workflows | `quote.accepted`, `invoice.paid`, `project.completed`, `appointment.*`, etc. |
| `ClickIn360_Web_Chat_Qualification_Flow_Updated.json` | Website chat AI qualification + booking + human handoff | Webchat widget → N8N; calls `GET /api/integrations/conversations/session-state`, `POST .../sync` |
| `ClickIn360_Whatsapp_Flow_Updated.json` | WhatsApp AI + booking + human handoff (no GHL) | Meta webhook → N8N; same CRM conversation APIs |
| `ClickIn360_Onboarding_A_Kickoff.json` | Welcome email + kickoff booking link (`/book/{token}`) | Router on `quote.accepted` + `invoice.paid` (both required) |
| `ClickIn360_Onboarding_B_Assets_Reminders.json` | Questionnaire reminders, Drive folder, asset checklist | Sub-workflow from Onboarding A |
| `ClickIn360_Onboarding_C_Advocacy.json` | Post-onboarding advocacy (review email removed — handled by Project Advocacy) | Sub-workflow from Onboarding B completion |
| `ClickIn360_Appointment_Reminders.json` | 24h email + 1h WhatsApp reminders; cancels on delete | `appointment.created` / `appointment.updated` / `appointment.deleted` webhooks |
| `ClickIn360_Project_Advocacy.json` | Project feedback form email; positive path → Google review after delay | `project.completed` webhook |

## Legacy / reference (do not activate)

- `ClickIn360 Web Chat Qualification Flow.json`
- `Final ClickIn360 Web Chat Qualification Flow (1).json`
- `ClickIn360 Whatsapp Flow New Version.json`
- `Final ClickIn360 Whatsapp Flow.json`

## CRM API endpoints used by flows

| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/integrations/conversations/session-state` | GET | `x-n8n-secret` |
| `/api/integrations/conversations/sync` | POST | `x-n8n-secret` |
| `/api/integrations/n8n/inbound` | POST | `x-n8n-secret` |
| `/api/leads/booking-offers` | GET | Public (lang query) |
| `/api/leads/form-submission` | POST | Public |
| `/api/calendar/events` (booking create) | POST | `x-n8n-secret` or service paths per node |

All N8N → CRM nodes should set **Continue On Fail** = true so a single API error does not halt the workflow.

## Active node naming

Onboarding and appointment flows use `*2` suffix nodes (e.g. `Build Welcome Email2`) as the active path. Older nodes are disabled — verify disabled nodes are not wired to the execution path after import.
