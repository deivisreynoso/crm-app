import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceWrite } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { sendReviewRequest } from "@/lib/reviews/send-review-request";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  ticket_id: z.string().uuid().optional(),
  subject: z.string().max(998).optional(),
  body: z.string().max(100_000).optional(),
  cc: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, error } = await requireAuth();
    if (error) return error;

    const writeError = requireWorkspaceWrite(role!);
    if (writeError) return writeError;

    const { id: contactId } = await context.params;
    let ticketId: string | undefined;
    let subjectOverride: string | undefined;
    let bodyOverride: string | undefined;
    let cc: string | undefined;
    try {
      const body = await req.json();
      const parsed = bodySchema.safeParse(body);
      if (parsed.success) {
        ticketId = parsed.data.ticket_id;
        subjectOverride = parsed.data.subject?.trim() || undefined;
        bodyOverride = parsed.data.body?.trim() || undefined;
        cc = parsed.data.cc?.trim() || undefined;
      }
    } catch {
      // empty body is fine
    }

    const supabase = createServerSideClient();
    const result = await sendReviewRequest(supabase, {
      actorUserId: userId!,
      workspaceOwnerId: workspaceOwnerId!,
      contactId,
      ticketId,
      subjectOverride,
      bodyOverride,
      cc,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/contacts/[id]/request-review:", err);
    return NextResponse.json(
      { error: "Failed to send review invitation" },
      { status: 500 }
    );
  }
}
