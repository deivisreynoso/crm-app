import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Legacy SMTP document send — replaced by Gmail / Workspace per-user sending.
 * @deprecated Use POST /api/documents/{id}/send-via-gmail
 */
export async function POST(_req: Request, context: RouteContext) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await context.params;

  return NextResponse.json(
    {
      error:
        "Document email via SMTP is disabled. Connect Google Workspace in Settings and use POST /api/documents/{id}/send-via-gmail instead.",
      send_via_gmail_path: `/api/documents/${id}/send-via-gmail`,
    },
    { status: 410 }
  );
}
