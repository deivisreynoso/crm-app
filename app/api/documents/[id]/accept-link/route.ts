import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { isQuoteDocument } from "@/lib/documents/kinds";
import { ensureAcceptToken, quoteAcceptPublicUrl } from "@/lib/quotes/accept-token";

type RouteContext = { params: Promise<{ id: string }> };

/** Ensure quote has a customer accept link and return the public URL. */
export async function POST(_req: Request, context: RouteContext) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .select("id, type, accept_token")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .single();

    if (dbError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!isQuoteDocument(doc.type as string)) {
      return NextResponse.json(
        { error: "Only quotes support customer acceptance links." },
        { status: 400 }
      );
    }

    const token = await ensureAcceptToken(supabase, {
      id: doc.id,
      type: doc.type as string,
      accept_token: doc.accept_token as string | null,
    });

    if (!token) {
      return NextResponse.json({ error: "Could not create link" }, { status: 500 });
    }

    return NextResponse.json({
      accept_token: token,
      accept_url: quoteAcceptPublicUrl(token),
    });
  } catch (err) {
    console.error("POST /api/documents/[id]/accept-link:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
