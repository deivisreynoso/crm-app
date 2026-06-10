-- Allow deleting auth.users (teammates) without "Database error deleting user".
-- Non-critical assignee / actor references are set to NULL on user delete.
-- Each block runs only if the column exists (safe on partial migration history).

-- audit_logs.user_id (main blocker for Supabase Auth delete)
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_assigned_to_fkey;
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_assigned_to_fkey
      FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_assigned_to_fkey
      FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_assigned_to_fkey;
    ALTER TABLE tickets
      ADD CONSTRAINT tickets_assigned_to_fkey
      FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'default_sales_assignee'
  ) THEN
    ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_default_sales_assignee_fkey;
    ALTER TABLE user_settings
      ADD CONSTRAINT user_settings_default_sales_assignee_fkey
      FOREIGN KEY (default_sales_assignee) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'opportunities' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_owner_id_fkey;
    ALTER TABLE opportunities
      ADD CONSTRAINT opportunities_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notes' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_created_by_fkey;
    ALTER TABLE notes
      ADD CONSTRAINT notes_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_created_by_fkey;
    ALTER TABLE activities
      ADD CONSTRAINT activities_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contact_emails' AND column_name = 'mailbox_user_id'
  ) THEN
    ALTER TABLE contact_emails DROP CONSTRAINT IF EXISTS contact_emails_mailbox_user_id_fkey;
    ALTER TABLE contact_emails
      ADD CONSTRAINT contact_emails_mailbox_user_id_fkey
      FOREIGN KEY (mailbox_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;
