import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireConversationIntegrationAuth } from "@/lib/integrations/conversations/auth";
import { syncConversationTurn } from "@/lib/conversations/sync";
import { createServerSideClient } from "@/lib/supabase";

const qualificationSchema = z
  .object({
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    platform: z.string().nullable().optional(),
    channels: z.array(z.string()).optional(),
    friction_area: z.string().nullable().optional(),
    signals: z.array(z.string()).optional(),
    temperature: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    message_volume: z.string().nullable().optional(),
    main_customer_questions: z.array(z.string()).optional(),
  })
  .optional();

const bodySchema = z
  .object({
    session_id: z.string().min(1),
    channel: z.enum(["whatsapp", "webchat"]),
    phone_number: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    inbound_message: z.string().optional(),
    ai_reply: z.string().nullable().optional(),
    next_action: z.string(),
    qualification: qualificationSchema,
    contact_id: z.string().uuid().nullable().optional(),
    human_review_requested: z.boolean().optional(),
    outbound_only: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.outbound_only) {
      if (!data.ai_reply?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ai_reply is required when outbound_only is true",
          path: ["ai_reply"],
        });
      }
    } else if (!data.inbound_message) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "inbound_message is required",
        path: ["inbound_message"],
      });
    }
  });

export async function POST(req: NextRequest) {
  const auth = requireConversationIntegrationAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const result = await syncConversationTurn(
      supabase,
      auth.workspaceOwnerId,
      parsed.data
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/integrations/conversations/sync:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to sync conversation",
      },
      { status: 500 }
    );
  }
}
