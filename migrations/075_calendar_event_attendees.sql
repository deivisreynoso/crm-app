-- Additional attendees on calendar events (users + contacts beyond primary assignee/contact).

CREATE TABLE calendar_event_attendees (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  attendee_type     TEXT NOT NULL CHECK (attendee_type IN ('user', 'contact')),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id        UUID REFERENCES contacts(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ DEFAULT now(),
  CHECK (
    (attendee_type = 'user'    AND user_id    IS NOT NULL AND contact_id IS NULL) OR
    (attendee_type = 'contact' AND contact_id IS NOT NULL AND user_id    IS NULL)
  )
);

CREATE INDEX calendar_event_attendees_event   ON calendar_event_attendees (calendar_event_id);
CREATE INDEX calendar_event_attendees_contact ON calendar_event_attendees (contact_id);

ALTER TABLE calendar_event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_event_attendees_select ON calendar_event_attendees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = calendar_event_attendees.calendar_event_id
        AND finance_actor_in_workspace(ce.user_id)
    )
  );

CREATE POLICY calendar_event_attendees_insert ON calendar_event_attendees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = calendar_event_attendees.calendar_event_id
        AND finance_actor_in_workspace(ce.user_id)
    )
  );

CREATE POLICY calendar_event_attendees_delete ON calendar_event_attendees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = calendar_event_attendees.calendar_event_id
        AND finance_actor_in_workspace(ce.user_id)
    )
  );

CREATE POLICY calendar_event_attendees_update ON calendar_event_attendees
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = calendar_event_attendees.calendar_event_id
        AND finance_actor_in_workspace(ce.user_id)
    )
  );
