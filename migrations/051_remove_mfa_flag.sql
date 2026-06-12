-- Iteration 2: MFA preference removed (not used; login via Google SSO or email/password only)

ALTER TABLE user_profiles DROP COLUMN IF EXISTS mfa_enabled;
