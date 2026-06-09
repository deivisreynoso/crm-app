-- Remove automation email templates; keep review_request (Google review link) templates.

DELETE FROM email_templates
WHERE category = 'automation';

-- If slug column exists (from optional automations migration), remove by slug too.
DO $$
BEGIN
  DELETE FROM email_templates
  WHERE slug IN (
    'quote_accepted',
    'quote_accepted_internal',
    'quote_declined_alert',
    'appointment_confirmation',
    'appointment_confirmation_internal',
    'appointment_reminder_24h',
    'appointment_reminder_1h',
    'new_lead_alert',
    'overdue_task_alert',
    'ticket_confirmation',
    'ticket_alert_internal'
  );
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;
