import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationChannel, ConversationHandler } from "@/lib/conversations/types";

export async function getConversationSessionState(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  input: {
    session_id: string;
    channel: ConversationChannel;
  }
): Promise<{
  handler: ConversationHandler;
  conversation_id: string | null;
  human_review_requested: boolean;
}> {
  const { data } = await supabase
    .from("conversations")
    .select("id, handler, human_review_requested")
    .eq("user_id", workspaceOwnerId)
    .eq("channel", input.channel)
    .eq("external_session_id", input.session_id)
    .maybeSingle();

  if (!data) {
    return {
      handler: "ai",
      conversation_id: null,
      human_review_requested: false,
    };
  }

  return {
    handler: (data.handler as ConversationHandler) ?? "ai",
    conversation_id: data.id as string,
    human_review_requested: Boolean(data.human_review_requested),
  };
}
