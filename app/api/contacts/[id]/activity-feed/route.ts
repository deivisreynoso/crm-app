import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { verifyContactInWorkspace } from "@/lib/contacts/verify-contact-ownership";

type RouteContext = { params: Promise<{ id: string }> };

export type ActivityFeedItem = {
  id: string;
  source: "note" | "activity";
  type: string;
  content: string;
  created_at: string;
  is_system: boolean;
  email_subject?: string;
  email_body?: string;
  email_direction?: "outbound" | "inbound";
};

function mapActivityContent(
  type: string,
  description: string | null,
  metadata: Record<string, unknown> | null
): Pick<
  ActivityFeedItem,
  "content" | "email_subject" | "email_body" | "email_direction"
> {
  if (type !== "email" || !metadata) {
    return { content: description ?? "" };
  }

  const direction =
    metadata.direction === "inbound" || metadata.direction === "outbound"
      ? metadata.direction
      : undefined;
  const subject =
    typeof metadata.subject === "string" ? metadata.subject : "";
  const body = typeof metadata.body === "string" ? metadata.body : "";

  if (body || subject) {
    const label = direction === "inbound" ? "Email received" : "Email sent";
    const subj = subject.trim() || "(No subject)";
    return {
      content: body ? `${label}: ${subj}\n\n${body}` : `${label}: ${subj}`,
      email_subject: subj,
      email_body: body,
      email_direction: direction,
    };
  }

  return { content: description ?? "" };
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id: contactId } = await context.params;
    if (!(await verifyContactInWorkspace(workspaceOwnerId!, contactId))) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const supabase = createServerSideClient();

    const [notesRes, activitiesRes] = await Promise.all([
      supabase
        .from("notes")
        .select("id, content, activity_type, created_at")
        .eq("user_id", workspaceOwnerId!)
        .eq("entity_type", "contact")
        .eq("entity_id", contactId)
        .order("created_at", { ascending: false }),
      supabase
        .from("activities")
        .select("id, type, description, metadata, created_at")
        .eq("user_id", workspaceOwnerId!)
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false }),
    ]);

    if (notesRes.error) throw notesRes.error;

    const noteItems: ActivityFeedItem[] = (notesRes.data ?? []).map((n) => ({
      id: `note-${n.id}`,
      source: "note" as const,
      type: n.activity_type ?? "note",
      content: n.content,
      created_at: n.created_at,
      is_system: false,
    }));

    const activityItems: ActivityFeedItem[] = (activitiesRes.error
      ? []
      : (activitiesRes.data ?? [])
    ).map((a) => {
      const meta = (a.metadata as Record<string, unknown> | null) ?? null;
      const emailFields = mapActivityContent(a.type, a.description, meta);
      return {
        id: `activity-${a.id}`,
        source: "activity" as const,
        type: a.type,
        created_at: a.created_at,
        is_system: ["system", "update", "created", "review_request"].includes(a.type),
        ...emailFields,
      };
    });

    const data = [...noteItems, ...activityItems].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET activity-feed:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
