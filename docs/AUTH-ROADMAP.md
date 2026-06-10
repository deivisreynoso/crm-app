# Authentication roadmap — ClickIn 360 CRM

Living plan for login, password reset, and Google Workspace sign-in.

Related: [CLICKIN360-CRM-API.md](./CLICKIN360-CRM-API.md) (env vars, auth endpoints)

---

## Current state (2026)

| Flow | How it works |
|------|----------------|
| **Login** | Email + password via NextAuth → Supabase `signInWithPassword` |
| **Access control** | Invite-only: `team_members` row + `userCanAccessCrm` |
| **Registration** | Invite link → `POST /api/team/invites/register` (confirmed email, workspace link) |
| **Password reset** | `POST /api/auth/forgot-password` → Mailgun email with `token_hash` link |
| **Team invite email** | Mailgun when configured; copy link in UI as fallback |
| **Google** | Gmail + Calendar only (post-login Integrations), not login |

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
   - **Mailgun** (required for reset + invite email):
     ```
     MAILGUN_API_KEY=
     MAILGUN_DOMAIN=mail.clickin360.com
     MAILGUN_FROM=ClickIn 360 <no-reply@mail.clickin360.com
     ```

2. **Supabase → Authentication → URL Configuration**
   - Site URL: `https://www.clickin360.com`
   - Redirect URLs: `https://www.clickin360.com/auth/callback`

3. **Verify env:** `./scripts/check-env-local.sh .env.local --container`

4. **Remove duplicate users** manually in Supabase Auth when re-inviting with a new email.

---

## Phase plan: Google login + email for low-access roles

### Goals

- **Owner / admin / sales** (`@clickin360.com`): Sign in with Google Workspace; Gmail + Calendar connected in one step (Phase 3 from prior discussion).
- **Viewer / external / low-trust roles**: Keep **email + password** only (no Google), or Google blocked by domain/role policy.
- **Dual login** always available for owner as break-glass (email password retained).

### Phase 1 — Google sign-in only (no auto Gmail/Calendar)

| Item | Work |
|------|------|
| NextAuth | Add `GoogleProvider` with `hd=clickin360.com` (Workspace domain hint) |
| Login UI | “Continue with Google” on `/login` |
| Account linking | Match Supabase user by verified Google email → existing `auth.users` row |
| Access | Reuse `userCanAccessCrm` + invite checks — Google does not bypass team |
| Roles | All roles can use Google initially; measure adoption |

**Risks:** Google OAuth redirect URIs on production; users with personal Gmail blocked unless on team invite list.

### Phase 2 — Role-based login methods

| Role | Login allowed |
|------|----------------|
| `owner`, `admin` | Google **or** email/password |
| `sales` | Google **or** email/password (Workspace email required for Google) |
| `viewer` | **Email/password only** (demo accounts, external reviewers) |

Implementation:

- Add `auth_method` or derive from `team_members.role` at login.
- Login page: hide Google button when `viewer`; optional server check on OAuth callback.
- Store preference in `user_profiles` (`primary_auth_provider`).

### Phase 3 — Google login + auto Gmail/Calendar

| Item | Work |
|------|------|
| OAuth scopes | Combined: `openid email profile`, Gmail send/read, Calendar |
| Callback | Save tokens to `google_gmail_tokens` / `google_calendar_tokens` |
| Integrations UI | Show “Connected” after first Google login |
| Fallback | If user denies Gmail scope → CRM access OK, Integrations prompt later |

**Risks:** Google app verification for Gmail scopes; 1–2 weeks if external testers needed.

### Phase 4 — Decommission personal emails (optional)

- Migrate team to `@clickin360.com` only.
- Remove old `@gmail.com` auth users after data migration.
- Enforce domain in `userCanAccessCrm` or invite flow.

---

## Architecture sketch (target)

```text
/login
  ├─ Email + password → NextAuth Credentials → Supabase
  └─ Continue with Google → NextAuth Google → link/create Supabase user
        → (Phase 3) store Gmail/Calendar tokens

Access gate (unchanged):
  team_members.member_user_id OR workspace owner

Transactional email (Mailgun):
  - Team invites
  - Password reset (token_hash links)
  - Future: security notifications
```

---

## Not in scope yet

- SSO/SAML (Enterprise Google beyond OAuth)
- Magic-link login (Supabase OTP) as primary
- Per-user “force password reset on first login”

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06 | Invite register via admin API (`email_confirm: true`); Mailgun-only reset in prod; clearer login errors; remove teammate deletes auth user |
