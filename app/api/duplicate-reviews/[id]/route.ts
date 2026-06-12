import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { mergeContacts, type ContactRow } from "@/lib/contacts/merge-contacts";
import { humanizeDbError } from "@/lib/validation-errors";
import { recordAuditLog } from "@/lib/audit/record";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json();
    const action = body.action as "dismiss" | "merge";
    const keepId = body.keep_contact_id as string | undefined;

    const supabase = createServerSideClient();
    const { data: review, error: fetchError } = await supabase
      .from("duplicate_reviews")
      .select("*")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .single();

    if (fetchError || !review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (action === "dismiss") {
      const { data, error: dbError } = await supabase
        .from("duplicate_reviews")
        .update({ status: "dismissed" })
        .eq("id", id)
        .select()
        .single();
      if (dbError) {
        return NextResponse.json(
          { error: humanizeDbError(dbError.message) },
          { status: 500 }
        );
      }
      return NextResponse.json(data);
    }

    if (action === "merge") {
      const id1 = review.contact1_id as string;
      const id2 = review.contact2_id as string;
      const primaryId = keepId === id2 ? id2 : id1;
      const secondaryId = primaryId === id1 ? id2 : id1;

      const { data: primary } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", primaryId)
        .eq("user_id", workspaceOwnerId!)
        .single();
      const { data: secondary } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", secondaryId)
        .eq("user_id", workspaceOwnerId!)
        .single();

      if (!primary || !secondary) {
        return NextResponse.json({ error: "Contacts not found" }, { status: 404 });
      }

      try {
        await mergeContacts(
          supabase,
          workspaceOwnerId!,
          primary as ContactRow,
          secondary as ContactRow
        );
      } catch (mergeErr) {
        const msg = mergeErr instanceof Error ? mergeErr.message : "Merge failed";
        return NextResponse.json({ error: humanizeDbError(msg) }, { status: 500 });
      }

      const { data, error: dbError } = await supabase
        .from("duplicate_reviews")
        .update({ status: "merged" })
        .eq("id", id)
        .select()
        .single();

      if (dbError) {
        return NextResponse.json(
          { error: humanizeDbError(dbError.message) },
          { status: 500 }
        );
      }

      await recordAuditLog({
        workspaceOwnerId: workspaceOwnerId!,
        actorUserId: userId!,
        action: "contact.merge",
        entityType: "contact",
        entityId: primaryId,
        changeSummary: `Merged contact ${secondaryId} into ${primaryId}`,
        req,
      });

      return NextResponse.json({ review: data, merged_into: primaryId });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("PATCH /api/duplicate-reviews/[id]:", err);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}
