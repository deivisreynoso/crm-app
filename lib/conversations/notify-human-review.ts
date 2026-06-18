import type { SupabaseClient } from "@supabase/supabase-js";
import { notifySalesGroupLeadAlert } from "@/lib/notifications/sales-group-events";
import type { ConversationChannel } from "@/lib/conversations/types";

export async function notifyConversationHumanReview(
  supabase: SupabaseClient,
  input: {
    workspaceOwnerId: string;
    conversationId: string;
    channel: ConversationChannel;
    label: string;
    contactId?: string | null;
    leadEmail?: string | null;
  }
) {
  const source = input.channel === "whatsapp" ? "whatsapp" : "webchat";

  await notifySalesGroupLeadAlert(supabase, {
    workspaceOwnerId: input.workspaceOwnerId,
    contactId: input.contactId ?? input.conversationId,
    leadName: input.label,
    leadEmail: input.leadEmail?.trim() || "unknown@visitor.local",
    source,
    reason: "human_review",
    conversationId: input.conversationId,
  });
}
