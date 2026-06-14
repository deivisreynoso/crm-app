# Authentication roadmap — ClickIn 360 CRM

Living plan for login, password reset, Google Workspace sign-in, and owner dual-email mapping.

Related: [CLICKIN360-CRM-API.md](./CLICKIN360-CRM-API.md) (env vars, auth endpoints), [CRM-FEATURES.md](./CRM-FEATURES.md) (feature list)

---

## Current state (June 2026)

| Flow | How it works |
|------|----------------|
| **Login (email/password)** | NextAuth Credentials → Supabase `signInWithPassword` |
| **Login (Google)** | NextAuth Google provider (`hd=clickin360.com`) → `resolveGoogleLoginUser` |
| **Access control** | Invite-only: `team_members` row + `userCanAccessCrm` |
| **Registration** | Invite link → `POST /api/team/invites/register` (confirmed email, workspace link) |
| **Password reset** | `POST /api/auth/forgot-password` → Mailgun email with `token_hash` link |
| **Team invite email** | Mailgun when configured; copy link in UI as fallback |
| **Gmail + Calendar** | Post-login Integrations (per-user OAuth), separate from login OAuth |
| **Google Drive** | Post-login Integrations (workspace OAuth, owner/admin connects), separate from login OAuth |
| **Dual-email owner** | Canonical session maps alias emails to `WEBSITE_LEADS_USER_ID` via `OWNER_LOGIN_ALIASES` and/or `team_members` |

### Login methods by role

| Role | Email/password | Google Workspace (`@clickin360.com`) |
|------|----------------|--------------------------------------|
| **Owner** | Yes | Yes |
| **Admin** | Yes | Yes |
| **Sales** | Yes | Yes |
| **Viewer** | Yes (only method) | No |

Implementation: `lib/auth/login-policy.ts`, enforced in `lib/auth.ts` (`authorize` + `signIn` callbacks).

### Session identity (canonical vs auth user)

| Field | Meaning |
|-------|---------|
| `session.user.id` | **Canonical CRM user id** — workspace owner UUID for tenant data, integrations, `user_profiles` |
| `session.user.authUserId` | **Supabase auth.users id** used to sign in — used for password change and auth email updates |

When an owner signs in with a personal Gmail (`deivis.reynoso@gmail.com`) mapped to the workspace owner via `OWNER_LOGIN_ALIASES`, the session CRM id is the owner UUID while `authUserId` remains the personal auth account.

Code: `lib/auth/canonical-user.ts`, `lib/auth/supabase-auth-user.ts`.

---

## How to verify email in Supabase

In **Authentication → Users → select user**:

| Field | Verified? |
|-------|-----------|
| **Email** row shows green check / “Confirmed” | Yes |
| **`email_confirmed_at`** (Overview tab) has a timestamp | Yes |
| **`email_confirmed_at`** is empty / null | **Not verified** — login may fail |

After our register API (`email_confirm: true`), new invite signups should show **Confirmed** immediately.

**Manual fix:** Supabase → user → ⋮ → **Confirm email**, or delete user and re-invite after deploy.

---

## Production checklist (auth)

1. **`.env.local` on VPS**
   - `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL` = `https://www.clickin360.com`
   - Supabase keys (build args + runtime)
   - `WEBSITE_LEADS_USER_ID` = workspace owner Supabase UUID
   - Optional dual-email owner mapping:
     ```
     OWNER_LOGIN_ALIASES=deivis@clickin360.com,deivis.reynoso@gmail.com
     ```
   - **Google OAuth** (login + Integrations — Gmail, Calendar, **Drive**):
     ```
     GOOGLE_OAUTH_CLIENT_ID=
     GOOGLE_OAUTH_CLIENT_SECRET=
     ```
     Authorized redirect URIs must include `/api/auth/callback/google`, `/api/auth/google-gmail/callback`, `/api/auth/google-calendar/callback`, and `/api/auth/google-drive/callback` (or env overrides).
   - **Mailgun** (required for reset + invite email):
     ```
     MAILGUN_API_KEY=
     MAILGUN_DOMAIN=mail.clickin360.com
     MAILGUN_FROM=ClickIn 360 <no-reply@mail.clickin360.com>
     ```

2. **Supabase → Authentication → URL Configuration**
   - Site URL: `https://www.clickin360.com`
   - Redirect URLs: `https://www.clickin360.com/auth/callback`

3. **Google Cloud Console → OAuth client**
   - Authorized redirect URIs (production example):
     - `https://www.clickin360.com/api/auth/callback/google`
     - `https://www.clickin360.com/api/auth/google-gmail/callback`
     - `https://www.clickin360.com/api/auth/google-calendar/callback`
     - `https://www.clickin360.com/api/auth/google-drive/callback`

4. **Supabase migrations**
   - Run through **069** before connecting Google Drive (tokens table + document external columns)

5. **Owner dual-email (recommended SQL)**

   Link workspace Google email to the canonical owner in `team_members`:

   ```sql
   INSERT INTO team_members (owner_user_id, member_user_id, email, display_name, role)
   VALUES (
     'OWNER_UUID',
     'OWNER_UUID',
     'deivis@clickin360.com',
     'Deivis Reynoso',
     'admin'
   )
   ON CONFLICT (owner_user_id, email) DO UPDATE
   SET member_user_id = EXCLUDED.member_user_id;
   ```

6. **Verify env:** `./scripts/check-env-local.sh .env.local --container`

7. **Remove duplicate auth users** manually in Supabase Auth when re-inviting with a new email.

---

## Phase plan (remaining)

### Shipped

| Phase | Item | Status |
|-------|------|--------|
| 1 | Google sign-in (`GoogleProvider`, `hd=clickin360.com`) | ✅ |
| 1 | Account linking via email (`resolveGoogleLoginUser`) | ✅ |
| 2 | Role-based login methods (viewer = credentials only) | ✅ |
| — | Canonical owner dual-email session mapping | ✅ |
| — | `authUserId` for password/profile auth-admin calls | ✅ |
### Not yet shipped

| Phase | Item | Notes |
|-------|------|--------|
| 3 | Google login + auto Gmail/Calendar on first sign-in | Integrations still separate OAuth |
| 3 | Combined OAuth scopes at login | Gmail app verification may be required |
| 4 | Decommission personal emails | Optional; `OWNER_LOGIN_ALIASES` supports break-glass |
| — | MFA / TOTP | Removed in iteration 2 (migration **051**); not planned until product decision |
| — | SSO/SAML | Not planned |

---

## Architecture

```text
/login
  ├─ Email + password → NextAuth Credentials → Supabase
  │     → resolveCanonicalCrmUserId → session.user.id (canonical)
  │     → session.user.authUserId = Supabase auth id
  └─ Continue with Google → NextAuth Google → resolveGoogleLoginUser
        → canonical session id + authUserId

Access gate (unchanged):
  team_members.member_user_id OR workspace owner (WEBSITE_LEADS_USER_ID / owns team)

Transactional email (Mailgun):
  - Team invites
  - Password reset (token_hash links)
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06 | Google Drive workspace OAuth (migration 069); four redirect URIs in production checklist |
| 2026-06 | Iteration 2: removed MFA scaffolding (migration 051); auth login/session logic unchanged |
| 2026-06 | CRM enhancement sprint: Google SSO login, role-based methods, canonical dual-email owner mapping, `authUserId` session field |
| 2026-06 | Fix teammate login (fresh service-role client after sign-in); password reset via `token_hash`; OAuth redirects use `buildAppRedirectUrl` |
| 2026-06 | Invite register via admin API (`email_confirm: true`); Mailgun-only reset in prod; clearer login errors; remove teammate deletes auth user |
