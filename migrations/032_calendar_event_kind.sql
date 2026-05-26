-- Distinguish website-booked appointments from CRM-scheduled meetings
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS event_kind TEXT NOT NULL DEFAULT 'meeting'
  CHECK (event_kind IN ('meeting', 'appointment'));

UPDATE calendar_events
SET event_kind = 'appointment'
WHERE description ILIKE '%Booked via website%'
   OR title ILIKE 'Discovery call%';

COMMENT ON COLUMN calendar_events.event_kind IS
  'meeting = user-scheduled in CRM; appointment = public booking / discovery call';
