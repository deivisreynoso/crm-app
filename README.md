ClickIn 360 — marketing site + CRM (Next.js, Supabase, Docker on VPS).

**Documentation**

- [CRM features & roadmap](./docs/CRM-FEATURES.md) — living feature list and phase status
- [CRM API guide](./docs/CLICKIN360-CRM-API.md) — Lead API, integrations, session CRM routes
- [Auth roadmap](./docs/AUTH-ROADMAP.md) — login methods, Google SSO, dual-email owner mapping
- [Audit / hardening tracker](./docs/AUDIT-FIX-TRACKER.md)
- [WhatsApp + Webchat inbox](./docs/WHATSAPP-WEBCHAT-INBOX-PROPOSAL.md) — CRM inbox shipped; Meta webhook stays in N8N
- [N8N conversation flow updates](./docs/n8n/conversations-inbox-flow-updates.md) — session-state and sync nodes
- [Service ticket CID proposal](./docs/SERVICE-TICKET-CID-PROPOSAL.md) (implemented Sprint 3)

**Deploy (VPS):** pull `main`, then run `./scripts/deploy-vps.sh` (uses Docker layer cache; ~2–8 min for code-only changes). Use `./scripts/deploy-vps.sh --no-cache` only when dependencies or Dockerfile change (~15–25 min on a small VPS).

**Production checklist:**

- `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` must match your live host (e.g. `https://www.clickin360.com`)
- Supabase Auth → URL Configuration must allow `{APP_URL}/auth/callback` for forgot-password
- Run migrations **049**–**070** in Supabase if not applied (`052` = calendar colors, CID, support widget; **054–063** = Finances; **066–068** = conversations inbox; **069** = Google Drive OAuth + document external links; **070** = sales/support group emails + notification prefs)
- Supabase Auth → **Leaked password protection** — enable in the Supabase Dashboard (Authentication → Providers → Email); cannot be turned on via application code
- Public customer support: enable in **Settings → Support widget**; page at `/support`
- Set `WEBSITE_LEADS_USER_ID` to the workspace owner UUID; optional `OWNER_LOGIN_ALIASES` for owner dual-email login
- Google Cloud OAuth redirect URIs (must match env / `NEXT_PUBLIC_APP_URL` exactly):
  - `{APP_URL}/api/auth/callback/google` — Workspace login
  - `{APP_URL}/api/auth/google-gmail/callback` — per-user Gmail
  - `{APP_URL}/api/auth/google-calendar/callback` — per-user Calendar
  - `{APP_URL}/api/auth/google-drive/callback` — workspace Drive (owner/admin connect in Settings → Integrations or `/media`)
- After adding Drive scopes or migration **069**, reconnect Google Drive once in Settings
- Optional: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (invoice payment links; quote Pay Now when `payments_enabled` on quote); `MAILGUN_*` for invoice email, team invites, password reset; `GA4_PROPERTY_ID` + GA service account vars (Analytics → Website tab)
- Conversations inbox: deploy code + migration **066** before wiring N8N `POST /api/integrations/conversations/*` nodes (`x-website-secret`)
- **Finances** module at `/finances` — invoices, transactions ledger, Stripe payment links; schedule `GET /api/cron/mark-overdue-invoices` daily with `CRON_SECRET` header

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
