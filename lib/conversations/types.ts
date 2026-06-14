export type ConversationChannel = "whatsapp" | "webchat";
export type ConversationHandler = "ai" | "human";
export type ConversationStatus = "active" | "closed";
export type MessageDirection = "inbound" | "outbound";
export type MessageSenderType = "visitor" | "ai" | "human" | "system";

export type ConversationQualification = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  platform?: string | null;
  channels?: string[] | null;
  friction_area?: string | null;
  signals?: string[] | null;
  temperature?: string | null;
  summary?: string | null;
  message_volume?: string | null;
  main_customer_questions?: string[] | null;
};

export type ConversationRow = {
  id: string;
  user_id: string;
  channel: ConversationChannel;
  external_session_id: string;
  contact_id: string | null;
  status: ConversationStatus;
  handler: ConversationHandler;
  handler_user_id: string | null;
  human_review_requested: boolean;
  language: string | null;
  qualification: ConversationQualification;
  pending_action: string | null;
  booking_state: Record<string, unknown>;
  last_message_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationMessageRow = {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  sender_type: MessageSenderType;
  sender_user_id: string | null;
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ConversationListItem = ConversationRow & {
  contact_name: string | null;
  handler_user_name: string | null;
  last_message_preview: string | null;
};
