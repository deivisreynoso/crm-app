import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyConversationHumanReview } from "@/lib/conversations/notify-human-review";
import {
  consumePendingPollSecret,
  pollSecretFromQualification,
  qualificationWithPollSecret,
} from "@/lib/website/webchat-poll-auth";
import type {
  ConversationChannel,
  ConversationQualification,
} from "@/lib/conversations/types";

export type SyncConversationInput = {
  session_id: string;
  channel: ConversationChannel;
  phone_number?: string | null;
  name?: string | null;
  inbound_message?: string;
  ai_reply?: string | null;
  next_action: string;
  qualification?: ConversationQualification;
  contact_id?: string | null;
  human_review_requested?: boolean;
  outbound_only?: boolean;
};

function mergeQualification(
  existing: ConversationQualification,
  incoming: ConversationQualification,
  extras: { name?: string | null; phone?: string | null }
): ConversationQualification {
  const merged: ConversationQualification = { ...existing };
  const sources = [
    incoming,
    {
      name: extras.name ?? null,
      phone: extras.phone ?? null,
    },
  ];

  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (value !== null && value !== undefined && value !== "") {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }

  return merged;
}

function reviewLabel(input: SyncConversationInput): string {
  const q = input.qualification ?? {};
  return (
    input.name?.trim() ||
    q.name?.trim() ||
    input.phone_number?.trim() ||
    q.phone?.trim() ||
    input.session_id
  );
}

export async function syncConversationTurn(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  input: SyncConversationInput
): Promise<{ conversation_id: string; status: "synced" }> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id, qualification, human_review_requested")
    .eq("user_id", workspaceOwnerId)
    .eq("channel", input.channel)
    .eq("external_session_id", input.session_id)
    .maybeSingle();

  const qualification = mergeQualification(
    (existing?.qualification as ConversationQualification) ?? {},
    input.qualification ?? {},
    {
      name: input.name,
      phone: input.phone_number,
    }
  );

  const humanReviewRequested = Boolean(input.human_review_requested);
  const now = new Date().toISOString();

  const row = {
    user_id: workspaceOwnerId,
    channel: input.channel,
    external_session_id: input.session_id,
    contact_id: input.contact_id ?? undefined,
    status: "active" as const,
    handler: humanReviewRequested ? ("human" as const) : undefined,
    human_review_requested: humanReviewRequested,
    qualification,
    pending_action: input.next_action,
    last_message_at: now,
    updated_at: now,
  };

  let conversationId: string;

  if (existing?.id) {
    const updatePayload: Record<string, unknown> = {
      qualification,
      pending_action: input.next_action,
      human_review_requested: humanReviewRequested,
      last_message_at: now,
      updated_at: now,
    };
    if (input.channel === "webchat") {
      const pendingPollHash = consumePendingPollSecret(
        workspaceOwnerId,
        input.session_id
      );
      if (pendingPollHash && !pollSecretFromQualification(qualification)) {
        updatePayload.qualification = qualificationWithPollSecret(
          qualification,
          pendingPollHash
        );
      }
    }
    if (input.contact_id) updatePayload.contact_id = input.contact_id;
    if (humanReviewRequested) updatePayload.handler = "human";

    const { data: updated, error } = await supabase
      .from("conversations")
      .update(updatePayload)
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error || !updated) {
      throw new Error(error?.message ?? "Failed to update conversation");
    }
    conversationId = updated.id as string;
  } else {
    const pendingPollHash =
      input.channel === "webchat"
        ? consumePendingPollSecret(workspaceOwnerId, input.session_id)
        : null;

    const insertQualification = pendingPollHash
      ? qualificationWithPollSecret(qualification, pendingPollHash)
      : qualification;

    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        ...row,
        qualification: insertQualification,
        handler: humanReviewRequested ? "human" : "ai",
        human_review_requested: humanReviewRequested,
      })
      .select("id")
      .single();

    if (error || !created) {
      throw new Error(error?.message ?? "Failed to create conversation");
    }
    conversationId = created.id as string;
  }

  const messageRows: Array<{
    conversation_id: string;
    direction: "inbound" | "outbound";
    sender_type: "visitor" | "ai" | "human" | "system";
    body: string;
    metadata: Record<string, unknown>;
  }> = [];

  if (!input.outbound_only && input.inbound_message) {
    messageRows.push({
      conversation_id: conversationId,
      direction: "inbound",
      sender_type: "visitor",
      body: input.inbound_message,
      metadata: {},
    });
  }

  if (input.ai_reply?.trim()) {
    messageRows.push({
      conversation_id: conversationId,
      direction: "outbound",
      sender_type: "ai",
      body: input.ai_reply.trim(),
      metadata: {},
    });
  }

  if (messageRows.length > 0) {
    const { error: msgError } = await supabase
      .from("conversation_messages")
      .insert(messageRows);

    if (msgError) {
      throw new Error(msgError.message);
    }
  }

  const wasReviewRequested = Boolean(existing?.human_review_requested);
  if (humanReviewRequested && !wasReviewRequested) {
    const contactId = input.contact_id ?? null;
    let leadEmail: string | null = null;
    if (contactId) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("email")
        .eq("id", contactId)
        .eq("user_id", workspaceOwnerId)
        .maybeSingle();
      leadEmail = (contact?.email as string | null) ?? null;
    }
    const q = qualification as { email?: string | null };
    await notifyConversationHumanReview(supabase, {
      workspaceOwnerId,
      conversationId,
      channel: input.channel,
      label: reviewLabel(input),
      contactId,
      leadEmail: leadEmail ?? q.email ?? null,
    });
  }

  return { conversation_id: conversationId, status: "synced" };
}
