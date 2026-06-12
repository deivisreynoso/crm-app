-- Store visitor language on CID support sessions for localized confirmation emails.

ALTER TABLE support_cid_sessions
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

ALTER TABLE support_cid_sessions DROP CONSTRAINT IF EXISTS support_cid_sessions_language_check;
ALTER TABLE support_cid_sessions
  ADD CONSTRAINT support_cid_sessions_language_check
  CHECK (language IN ('en', 'es'));
