import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";
import { checkRateLimit, clientIpFromRequest } from "@/lib/api/rate-limit";
import { loadPublicQuoteByToken } from "@/lib/quotes/load-public-quote";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import { triggerN8NWebhook } from "@/lib/n8n";
import {
  emailSalesGroup,
  notifySalesGroupInApp,
  salesQuoteResponseGroupEmail,
} from "@/lib/notifications/workspace-groups";
import { fireWebhook } from "@/lib/webhooks/outbound";
import { isQuoteExpired } from "@/lib/quotes/expiry";
import { buildQuoteStatusPatch } from "@/lib/quotes/apply-status-change";
import { z } from "zod";

type RouteContext = { params: Promise<{ token: string }> };

const respondSchema = z
  .object({
    action: z.enum(["accept", "reject"]),
    name: z.string().max(200).optional(),
    email: z.string().email().optional().or(z.literal("")),
    disclaimer_acknowledged: z.boolean().optional(),
    loss_reason: z.string().max(100).optional(),
    loss_reason_notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "accept") {
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
    const ip = clientIpFromRequest(req);
    const limit = checkRateLimit(`quote-respond:${ip}`, 20, 3_600_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: limit.retryAfterSec
            ? { "Retry-After": String(limit.retryAfterSec) }
            : undefined,
        }
      );
    }

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

    if (
      isQuoteExpired(
        doc.expires_at as string | null | undefined,
        doc.valid_until as string | null | undefined
      )
    ) {
      return NextResponse.json(
        { error: "This quote has expired and can no longer be accepted.", status: "expired" },
        { status: 410 }
      );
    }

    const now = new Date().toISOString();
    const isAccept = parsed.data.action === "accept";
    const responseName = parsed.data.name?.trim() || null;
    const responseEmail = parsed.data.email?.trim().toLowerCase() || null;

    const patch = isAccept
      ? buildQuoteStatusPatch(doc.status as string, {
          status: "accepted",
          response_name: responseName,
          response_email: responseEmail,
        })
      : buildQuoteStatusPatch(doc.status as string, {
          status: "rejected",
          response_name: responseName,
          response_email: responseEmail,
          loss_reason: parsed.data.loss_reason,
          loss_reason_notes: parsed.data.loss_reason_notes,
        });

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

    const workspaceOwnerId = doc.user_id as string;

    if (isAccept) {
      void fireWebhook(supabase, workspaceOwnerId, "quote.accepted", {
        document_id: doc.id,
        document: updated,
        response_name: responseName,
        response_email: responseEmail,
      });
    }

    const quoteRef = (doc.quote_reference as string) || (doc.title as string);
    const kind = isAccept ? "sales_quote_accepted" : "sales_quote_declined";
    const verb = isAccept ? "accepted" : "declined";

    void notifySalesGroupInApp(supabase, workspaceOwnerId, {
      kind,
      title: `Quote ${quoteRef} ${verb}`,
      message: responseName ?? responseEmail ?? undefined,
      related_entity_type: "document",
      related_entity_id: doc.id as string,
    });

    const mail = salesQuoteResponseGroupEmail({
      quoteReference: quoteRef,
      action: isAccept ? "accepted" : "declined",
      responseName,
      responseEmail,
      documentId: doc.id as string,
    });
    void emailSalesGroup(
      supabase,
      workspaceOwnerId,
      mail.subject,
      mail.html,
      mail.text
    );

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
