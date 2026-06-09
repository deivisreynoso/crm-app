ClickIn 360 — marketing site + CRM (Next.js, Supabase, Docker on VPS).

**Documentation**

- [CRM features & roadmap](./docs/CRM-FEATURES.md) — living feature list and phase status
- [CRM API guide](./docs/CLICKIN360-CRM-API.md) — Lead API, integrations, session CRM routes
- [Audit / hardening tracker](./docs/AUDIT-FIX-TRACKER.md)

**Deploy (VPS):** pull `main`, then run `./scripts/deploy-vps.sh` (uses Docker layer cache; ~2–8 min for code-only changes). Use `./scripts/deploy-vps.sh --no-cache` only when dependencies or Dockerfile change (~15–25 min on a small VPS).

**Production checklist:** `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` must match your live host (e.g. `https://www.clickin360.com`). Supabase Auth → URL Configuration must allow `{APP_URL}/auth/callback` for forgot-password.

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
