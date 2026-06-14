import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notifications/create-notification";
import type { ConversationChannel } from "@/lib/conversations/types";

export async function notifyConversationHumanReview(
  supabase: SupabaseClient,
  input: {
    workspaceOwnerId: string;
    conversationId: string;
    channel: ConversationChannel;
    label: string;
  }
) {
  const channelLabel = input.channel === "whatsapp" ? "WhatsApp" : "Webchat";
  const title = "New conversation needs human review";
  const message = `${channelLabel} from ${input.label}`;

  await createNotification(supabase, input.workspaceOwnerId, {
    kind: "conversation_review",
    title,
    message,
    related_entity_type: "conversation",
    related_entity_id: input.conversationId,
  });

  const { data: admins } = await supabase
    .from("team_members")
    .select("member_user_id")
    .eq("owner_user_id", input.workspaceOwnerId)
    .eq("role", "admin")
    .not("member_user_id", "is", null);

  for (const row of admins ?? []) {
    if (!row.member_user_id || row.member_user_id === input.workspaceOwnerId) continue;
    await createNotification(supabase, row.member_user_id as string, {
      kind: "conversation_review",
      title,
      message,
      related_entity_type: "conversation",
      related_entity_id: input.conversationId,
    });
  }
}
