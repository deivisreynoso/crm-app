-- Unified WhatsApp + webchat conversation inbox

CREATE TABLE IF NOT EXISTS conversations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel                 TEXT NOT NULL CHECK (channel IN ('whatsapp', 'webchat')),
  external_session_id     TEXT NOT NULL,
  contact_id              UUID REFERENCES contacts(id) ON DELETE SET NULL,
  status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'closed')),
  handler                 TEXT NOT NULL DEFAULT 'ai'
                            CHECK (handler IN ('ai', 'human')),
  handler_user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  human_review_requested  BOOLEAN NOT NULL DEFAULT false,
  language                TEXT DEFAULT 'es',
  qualification           JSONB NOT NULL DEFAULT '{}',
  pending_action          TEXT,
  booking_state           JSONB NOT NULL DEFAULT '{}',
  last_message_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel, external_session_id)
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction         TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_type       TEXT NOT NULL CHECK (sender_type IN ('visitor', 'ai', 'human', 'system')),
  sender_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body              TEXT NOT NULL,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_user_status
  ON conversations (user_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_session
  ON conversations (user_id, channel, external_session_id);
CREATE INDEX IF NOT EXISTS conversations_human_review
  ON conversations (user_id, human_review_requested)
  WHERE human_review_requested = true;
CREATE INDEX IF NOT EXISTS conversation_messages_thread
  ON conversation_messages (conversation_id, created_at ASC);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_select ON conversations
  FOR SELECT USING (finance_actor_in_workspace(user_id));

CREATE POLICY conversations_insert ON conversations
  FOR INSERT WITH CHECK (finance_actor_in_workspace(user_id));

CREATE POLICY conversations_update ON conversations
  FOR UPDATE USING (finance_actor_in_workspace(user_id));

CREATE POLICY conversation_messages_select ON conversation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_messages.conversation_id
        AND finance_actor_in_workspace(c.user_id)
    )
  );

CREATE POLICY conversation_messages_insert ON conversation_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_messages.conversation_id
        AND finance_actor_in_workspace(c.user_id)
    )
  );

COMMENT ON TABLE conversations IS 'WhatsApp and webchat threads for unified inbox';
COMMENT ON TABLE conversation_messages IS 'Messages within a conversation thread';
