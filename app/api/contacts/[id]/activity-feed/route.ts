import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { verifyContactInWorkspace } from "@/lib/contacts/verify-contact-ownership";
import { resolveAuthorNames } from "@/lib/activities/resolve-author-names";
import { selectWithColumnFallback } from "@/lib/api/select-column-fallback";
import { parseStoredTimestamp } from "@/lib/utils/datetime";

type RouteContext = { params: Promise<{ id: string }> };

type NoteRow = {
  id: string;
  content: string;
  activity_type: string | null;
  created_at: string;
  created_by?: string | null;
  created_by_display_name?: string | null;
};

type ActivityRow = {
  id: string;
  type: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  created_by?: string | null;
  created_by_display_name?: string | null;
};

export type ActivityFeedItem = {
  id: string;
  source: "note" | "activity" | "calendar";
  type: string;
  content: string;
  created_at: string;
  is_system: boolean;
  author_name?: string;
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

function resolveAuthorName(
  storedName: string | null | undefined,
  createdBy: string | null | undefined,
  names: Map<string, string>
): string | undefined {
  const saved = storedName?.trim();
  if (saved) return saved;
  if (!createdBy) return undefined;
  return names.get(createdBy);
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

    const notesRes = await selectWithColumnFallback<NoteRow>(
      async (select) => {
        const result = await supabase
          .from("notes")
          .select(select)
          .eq("user_id", workspaceOwnerId!)
          .eq("entity_type", "contact")
          .eq("entity_id", contactId)
          .order("created_at", { ascending: false });
        return result as { data: NoteRow[] | null; error: { message: string } | null };
      },
      [
        "id, content, activity_type, created_at, created_by, created_by_display_name",
        "id, content, activity_type, created_at, created_by",
        "id, content, activity_type, created_at",
      ]
    );

    if (notesRes.error) throw notesRes.error;

    const activitiesRes = await selectWithColumnFallback<ActivityRow>(
      async (select) => {
        const result = await supabase
          .from("activities")
          .select(select)
          .eq("user_id", workspaceOwnerId!)
          .eq("contact_id", contactId)
          .order("created_at", { ascending: false });
        return result as {
          data: ActivityRow[] | null;
          error: { message: string } | null;
        };
      },
      [
        "id, type, description, metadata, created_at, created_by, created_by_display_name",
        "id, type, description, metadata, created_at, created_by",
        "id, type, description, metadata, created_at",
      ]
    );

    const eventsRes = await supabase
      .from("calendar_events")
      .select("id, title, description, start_time, event_kind, created_at")
      .eq("user_id", workspaceOwnerId!)
      .eq("contact_id", contactId)
      .order("start_time", { ascending: false });

    const authorIds = [
      ...(notesRes.data ?? []).map((n) => n.created_by ?? null),
      ...(activitiesRes.error ? [] : (activitiesRes.data ?? [])).map(
        (a) => a.created_by ?? null
      ),
    ].filter((id): id is string => typeof id === "string" && id.length > 0);
    const authorNames = await resolveAuthorNames(supabase, authorIds);

    const noteItems: ActivityFeedItem[] = (notesRes.data ?? []).map((n) => ({
      id: `note-${n.id}`,
      source: "note" as const,
      source_id: n.id as string,
      type: n.activity_type ?? "note",
      content: n.content,
      created_at: n.created_at,
      is_system: false,
      author_name: resolveAuthorName(
        n.created_by_display_name,
        n.created_by,
        authorNames
      ),
    }));

    const activityItems: ActivityFeedItem[] = (activitiesRes.error
      ? []
      : (activitiesRes.data ?? [])
    ).map((a) => {
      const meta = (a.metadata as Record<string, unknown> | null) ?? null;
      const emailFields = mapActivityContent(a.type, a.description, meta);
      const isSystem = ["system", "update", "created", "review_request"].includes(
        a.type
      );
      return {
        id: `activity-${a.id}`,
        source: "activity" as const,
        type: a.type,
        created_at: a.created_at,
        is_system: isSystem,
        author_name: isSystem
          ? undefined
          : resolveAuthorName(
              a.created_by_display_name,
              a.created_by,
              authorNames
            ),
        ...emailFields,
      };
    });

    const loggedEventIds = new Set<string>();
    if (!activitiesRes.error) {
      for (const a of activitiesRes.data ?? []) {
        const meta = (a.metadata as Record<string, unknown> | null) ?? null;
        const eid = meta?.calendar_event_id;
        if (typeof eid === "string") loggedEventIds.add(eid);
      }
    }

    const calendarItems: ActivityFeedItem[] = (eventsRes.error
      ? []
      : (eventsRes.data ?? [])
    )
      .filter((ev) => !loggedEventIds.has(ev.id as string))
      .map((ev) => {
        const start = ev.start_time as string;
        const title = (ev.title as string) || "Calendar event";
        const desc = (ev.description as string) || "";
        const kind = ev.event_kind === "appointment" ? "appointment" : "meeting";
        return {
          id: `calendar-${ev.id}`,
          source: "calendar" as const,
          type: kind,
          content: desc ? `${title}\n${desc}` : title,
          created_at: start || (ev.created_at as string),
          is_system: false,
        };
      });

    const data = [...noteItems, ...activityItems, ...calendarItems].sort(
      (a, b) =>
        parseStoredTimestamp(b.created_at).getTime() -
        parseStoredTimestamp(a.created_at).getTime()
    );

    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET activity-feed:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
