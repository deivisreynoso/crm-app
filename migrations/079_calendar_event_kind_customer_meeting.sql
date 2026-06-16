-- Customer kickoff / project meetings (onboarding booking flow).

ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_event_kind_check;

ALTER TABLE calendar_events
  ADD CONSTRAINT calendar_events_event_kind_check
  CHECK (event_kind IN ('meeting', 'appointment', 'customer_meeting'));

COMMENT ON COLUMN calendar_events.event_kind IS
  'meeting = CRM-scheduled; appointment = discovery/website; customer_meeting = onboarding kickoff';
