-- Fresh start: remove all CRM-captured email threads and email activity entries.
-- Does NOT disconnect Gmail (google_gmail_tokens) or delete email_templates.

DELETE FROM contact_emails;

DELETE FROM activities WHERE type = 'email';

-- Optional: uncomment to also remove manually logged "Email" notes on contacts
-- DELETE FROM notes WHERE activity_type = 'email';
