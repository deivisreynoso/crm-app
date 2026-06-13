-- Profile picture storage path on user_profiles (file lives in crm_documents bucket).

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS avatar_storage_path TEXT;

COMMENT ON COLUMN user_profiles.avatar_storage_path IS
  'Storage path for profile photo in crm_documents bucket';
