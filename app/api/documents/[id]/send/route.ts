import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { resolveDocumentContent } from "@/lib/documents/load-context";
import { sendEmail } from "@/lib/email/send";
import { resolveDocumentFileUrl } from "@/lib/storage/documents";
import { triggerN8NWebhook } from "@/lib/n8n";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const recipientEmail =
      typeof body.email === "string" ? body.email.trim() : "";

    const supabase = createServerSideClient();
    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .single();

    if (dbError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    let to = recipientEmail;
    if (!to && doc.contact_id) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("email")
        .eq("id", doc.contact_id)
        .maybeSingle();
      to = contact?.email?.trim() ?? "";
    }

    if (!to) {
      return NextResponse.json(
        { error: "Recipient email is required" },
        { status: 400 }
      );
    }

    const content = await resolveDocumentContent(supabase, doc);
    const fileUrl = await resolveDocumentFileUrl(
      supabase,
      doc.storage_path as string | undefined,
      doc.file_url as string | undefined
    );

    const linkBlock = fileUrl
      ? `<p><a href="${fileUrl}">View or download document</a></p>`
      : "";

    await sendEmail({
      to,
      subject: `Document: ${doc.title}`,
      html: `<h2>${doc.title}</h2><pre style="font-family:sans-serif;white-space:pre-wrap">${content}</pre>${linkBlock}`,
    });

    const { data: updated } = await supabase
      .from("documents")
      .update({
        status: "sent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    await triggerN8NWebhook("document.sent", updated ?? doc);

    return NextResponse.json({ success: true, status: "sent" });
  } catch (err) {
    console.error("POST /api/documents/[id]/send:", err);
    const message = err instanceof Error ? err.message : "Failed to send document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
