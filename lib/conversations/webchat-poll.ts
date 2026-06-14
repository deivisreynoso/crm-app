import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationMessageRow } from "@/lib/conversations/types";

/** Outbound human agent messages for the webchat widget (public poll). */
export async function getWebchatHumanMessagesForSession(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  sessionId: string,
  afterMessageId?: string | null
): Promise<ConversationMessageRow[]> {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", workspaceOwnerId)
    .eq("channel", "webchat")
    .eq("external_session_id", sessionId)
    .maybeSingle();

  if (!conversation?.id) return [];

  let query = supabase
    .from("conversation_messages")
    .select("*")
    .eq("conversation_id", conversation.id)
    .eq("direction", "outbound")
    .eq("sender_type", "human")
    .order("created_at", { ascending: true });

  if (afterMessageId) {
    const { data: anchor } = await supabase
      .from("conversation_messages")
      .select("created_at")
      .eq("id", afterMessageId)
      .eq("conversation_id", conversation.id)
      .maybeSingle();

    if (anchor?.created_at) {
      query = query.gt("created_at", anchor.created_at);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ConversationMessageRow[];
}
