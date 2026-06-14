-- Workspace group email routing and per-user sales/support in-app notification prefs.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS sales_group_email TEXT NOT NULL DEFAULT 'sales@clickin360.com',
  ADD COLUMN IF NOT EXISTS support_group_email TEXT NOT NULL DEFAULT 'support@clickin360.com';

COMMENT ON COLUMN user_settings.sales_group_email IS
  'Google Group / shared inbox for sales alerts (leads, invoice payments, quote responses).';
COMMENT ON COLUMN user_settings.support_group_email IS
  'Google Group / shared inbox for support alerts (service tickets).';

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS sales_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS support_notifications BOOLEAN DEFAULT true;

COMMENT ON COLUMN notification_preferences.sales_notifications IS
  'In-app alerts for sales group events: website leads, invoice payments, quote accept/decline.';
COMMENT ON COLUMN notification_preferences.support_notifications IS
  'In-app alerts for support group events: new service tickets.';
