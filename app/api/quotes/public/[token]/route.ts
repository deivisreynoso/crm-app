import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";
import { loadPublicQuoteByToken } from "@/lib/quotes/load-public-quote";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import { triggerN8NWebhook } from "@/lib/n8n";
import { z } from "zod";

type RouteContext = { params: Promise<{ token: string }> };

const respondSchema = z
  .object({
    action: z.enum(["accept", "reject"]),
    name: z.string().max(200).optional(),
    email: z.string().email().optional().or(z.literal("")),
    disclaimer_acknowledged: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "accept") {
      if (!data.name?.trim()) {
        ctx.addIssue({ code: "custom", message: "Name is required.", path: ["name"] });
      }
      if (!data.email?.trim()) {
        ctx.addIssue({ code: "custom", message: "Email is required.", path: ["email"] });
      }
      if (!data.disclaimer_acknowledged) {
        ctx.addIssue({
          code: "custom",
          message: "You must acknowledge the terms before accepting.",
          path: ["disclaimer_acknowledged"],
        });
      }
    }
  });

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const supabase = createServerSideClient();
    const quote = await loadPublicQuoteByToken(supabase, token);
    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }
    return NextResponse.json({ data: quote });
  } catch (err) {
    console.error("GET /api/quotes/public/[token]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = await req.json().catch(() => ({}));
    const parsed = respondSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("accept_token", token.trim())
      .maybeSingle();

    if (fetchError || !doc) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (doc.status === "accepted" || doc.status === "rejected") {
      return NextResponse.json(
        { error: "This quote has already been responded to.", status: doc.status },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const isAccept = parsed.data.action === "accept";
    const responseName = parsed.data.name?.trim() || null;
    const responseEmail = parsed.data.email?.trim().toLowerCase() || null;

    const patch = isAccept
      ? {
          status: "accepted" as const,
          accepted_at: now,
          rejected_at: null,
          signed_at: now,
          response_name: responseName,
          response_email: responseEmail,
          acceptance_disclaimer_acknowledged_at: now,
          updated_at: now,
        }
      : {
          status: "rejected" as const,
          rejected_at: now,
          accepted_at: null,
          signed_at: null,
          response_name: responseName,
          response_email: responseEmail,
          updated_at: now,
        };

    const { data: updated, error: updateError } = await supabase
      .from("documents")
      .update(patch)
      .eq("id", doc.id)
      .select()
      .single();

    if (updateError) {
      console.error("quote respond:", updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (doc.contact_id) {
      const ref = (doc.quote_reference as string) || doc.title;
      await logContactActivity(supabase, {
        userId: doc.user_id as string,
        contactId: doc.contact_id as string,
        type: "system",
        description: isAccept
          ? `Quote ${ref} accepted${responseName ? ` by ${responseName}` : ""}`
          : `Quote ${ref} declined${responseName ? ` by ${responseName}` : ""}`,
        metadata: {
          document_id: doc.id,
          action: parsed.data.action,
          response_email: responseEmail,
        },
      });
    }

    void triggerN8NWebhook(isAccept ? "quote.accepted" : "quote.rejected", {
      ...updated,
      response_name: responseName,
      response_email: responseEmail,
    });

    return NextResponse.json({
      success: true,
      status: updated.status,
      accepted_at: updated.accepted_at,
      rejected_at: updated.rejected_at,
    });
  } catch (err) {
    console.error("POST /api/quotes/public/[token]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
