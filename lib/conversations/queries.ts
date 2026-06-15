import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ConversationListItem,
  ConversationMessageRow,
  ConversationQualification,
  ConversationRow,
} from "@/lib/conversations/types";

function contactDisplayName(contact: {
  first_name?: string | null;
  last_name?: string | null;
} | null): string | null {
  if (!contact) return null;
  const name = [contact.first_name, contact.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || null;
}

function previewBody(body: string, max = 100): string {
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

async function attachListEnrichment(
  supabase: SupabaseClient,
  rows: ConversationRow[]
): Promise<ConversationListItem[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const contactIds = [
    ...new Set(rows.map((r) => r.contact_id).filter(Boolean)),
  ] as string[];
  const handlerIds = [
    ...new Set(rows.map((r) => r.handler_user_id).filter(Boolean)),
  ] as string[];

  const [contactsRes, profilesRes, lastMessagesRes] = await Promise.all([
    contactIds.length
      ? supabase
          .from("contacts")
          .select("id, first_name, last_name")
          .in("id", contactIds)
      : Promise.resolve({ data: [] as Array<{ id: string; first_name: string | null; last_name: string | null }> }),
    handlerIds.length
      ? supabase
          .from("user_profiles")
          .select("id, display_name")
          .in("id", handlerIds)
      : Promise.resolve({ data: [] as Array<{ id: string; display_name: string | null }> }),
    Promise.all(
      ids.map((conversationId) =>
        supabase
          .from("conversation_messages")
          .select("conversation_id, body, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      )
    ),
  ]);

  const contactMap = new Map(
    (contactsRes.data ?? []).map((c) => [c.id, contactDisplayName(c)])
  );
  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p.display_name?.trim() || null])
  );

  const lastMessageMap = new Map<string, string>();
  for (const res of lastMessagesRes) {
    const msg = res.data;
    if (msg?.conversation_id) {
      lastMessageMap.set(
        msg.conversation_id as string,
        previewBody(String(msg.body), 100)
      );
    }
  }

  return rows.map((row) => ({
    ...row,
    qualification: (row.qualification ?? {}) as ConversationQualification,
    contact_name: row.contact_id
      ? (contactMap.get(row.contact_id) ??
        (row.qualification as ConversationQualification)?.name ??
        null)
      : ((row.qualification as ConversationQualification)?.name ?? null),
    handler_user_name: row.handler_user_id
      ? (profileMap.get(row.handler_user_id) ?? null)
      : null,
    last_message_preview: lastMessageMap.get(row.id) ?? null,
  }));
}

export async function listConversations(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  filters: {
    channel?: string;
    status?: string;
    human_review?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ data: ConversationListItem[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("conversations")
    .select("*", { count: "exact" })
    .eq("user_id", workspaceOwnerId)
    .order("last_message_at", { ascending: false })
    .range(from, to);

  if (filters.channel === "whatsapp" || filters.channel === "webchat") {
    query = query.eq("channel", filters.channel);
  }
  if (filters.status === "active" || filters.status === "closed") {
    query = query.eq("status", filters.status);
  }
  if (filters.human_review === true) {
    query = query.eq("human_review_requested", true);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as ConversationRow[];

  if (filters.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    rows = rows.filter((row) => {
      const q = (row.qualification ?? {}) as ConversationQualification;
      const haystack = [
        q.name,
        q.phone,
        q.email,
        row.external_session_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  const enriched = await attachListEnrichment(supabase, rows);

  return {
    data: enriched,
    total: count ?? enriched.length,
    page,
    limit,
  };
}

export async function getConversationDetail(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  conversationId: string
): Promise<(ConversationRow & { messages: ConversationMessageRow[] }) | null> {
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!conversation) return null;

  const { data: messages, error: msgError } = await supabase
    .from("conversation_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (msgError) throw new Error(msgError.message);

  return {
    ...(conversation as ConversationRow),
    qualification: (conversation.qualification ?? {}) as ConversationQualification,
    messages: (messages ?? []) as ConversationMessageRow[],
  };
}

export async function getConversationMessagesAfter(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  conversationId: string,
  afterMessageId?: string | null
): Promise<ConversationMessageRow[]> {
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (convError) throw new Error(convError.message);
  if (!conversation) return [];

  let query = supabase
    .from("conversation_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (afterMessageId) {
    const { data: anchor } = await supabase
      .from("conversation_messages")
      .select("created_at")
      .eq("id", afterMessageId)
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (anchor?.created_at) {
      query = query.gt("created_at", anchor.created_at);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ConversationMessageRow[];
}

export async function getConversationForWorkspace(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  conversationId: string
): Promise<ConversationRow | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    ...(data as ConversationRow),
    qualification: (data.qualification ?? {}) as ConversationQualification,
  };
}
