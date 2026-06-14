import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceWrite } from "@/lib/api/auth";
import {
  getConversationForWorkspace,
  getConversationMessagesAfter,
} from "@/lib/conversations/queries";
import type { ConversationQualification } from "@/lib/conversations/types";
import { sendWhatsAppText } from "@/lib/conversations/whatsapp-send";
import { createServerSideClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

const postSchema = z.object({
  body: z.string().min(1),
});

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const after = new URL(req.url).searchParams.get("after");
    const supabase = createServerSideClient();
    const messages = await getConversationMessagesAfter(
      supabase,
      workspaceOwnerId!,
      id,
      after
    );

    return NextResponse.json({ data: messages });
  } catch (err) {
    console.error("GET /api/conversations/[id]/messages:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, error } = await requireAuth();
    if (error) return error;

    const writeError = requireWorkspaceWrite(role!);
    if (writeError) return writeError;

    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const conversation = await getConversationForWorkspace(
      supabase,
      workspaceOwnerId!,
      id
    );

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conversation.handler !== "human") {
      return NextResponse.json(
        { error: "Take over the conversation before sending a reply" },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const qualification = conversation.qualification as ConversationQualification;

    const { data: message, error: insertError } = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id: id,
        direction: "outbound",
        sender_type: "human",
        sender_user_id: userId!,
        body: parsed.data.body,
        metadata: {},
      })
      .select("*")
      .single();

    if (insertError || !message) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to save message" },
        { status: 500 }
      );
    }

    if (conversation.channel === "whatsapp") {
      const sendResult = await sendWhatsAppText(
        qualification.phone ?? conversation.external_session_id,
        parsed.data.body,
        {
          externalSessionId: conversation.external_session_id,
          qualificationPhone: qualification.phone,
        }
      );

      if (!sendResult.ok) {
        return NextResponse.json({ error: sendResult.error }, { status: 502 });
      }

      await supabase
        .from("conversation_messages")
        .update({
          metadata: { channel: "whatsapp", whatsapp_message_id: sendResult.messageId },
        })
        .eq("id", message.id);
    }

    await supabase
      .from("conversations")
      .update({ last_message_at: now, updated_at: now })
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!);

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error("POST /api/conversations/[id]/messages:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
