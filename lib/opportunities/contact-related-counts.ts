import type { createServerSideClient } from "@/lib/supabase";
import { QUOTE_DOCUMENT_TYPES } from "@/lib/documents/kinds";
import type { ContactRelatedCounts } from "@/types";

function countByContactId(
  rows: { contact_id: string | null }[] | null | undefined
) {
  const map = new Map<string, number>();
  for (const row of rows ?? []) {
    if (!row.contact_id) continue;
    map.set(row.contact_id, (map.get(row.contact_id) ?? 0) + 1);
  }
  return map;
}

export async function fetchContactRelatedCounts(
  supabase: ReturnType<typeof createServerSideClient>,
  userId: string,
  contactIds: string[]
): Promise<Map<string, ContactRelatedCounts>> {
  const uniqueIds = [...new Set(contactIds.filter(Boolean))];
  const empty = new Map<string, ContactRelatedCounts>();
  if (!uniqueIds.length) return empty;

  const [quotesRes, eventsRes, tasksRes] = await Promise.all([
    supabase
      .from("documents")
      .select("contact_id")
      .eq("user_id", userId)
      .in("contact_id", uniqueIds)
      .in("type", [...QUOTE_DOCUMENT_TYPES]),
    supabase
      .from("calendar_events")
      .select("contact_id")
      .eq("user_id", userId)
      .in("contact_id", uniqueIds),
    supabase
      .from("tasks")
      .select("contact_id")
      .eq("user_id", userId)
      .in("contact_id", uniqueIds),
  ]);

  if (quotesRes.error) {
    console.error("fetchContactRelatedCounts quotes:", quotesRes.error.message);
  }
  if (eventsRes.error) {
    console.error(
      "fetchContactRelatedCounts appointments:",
      eventsRes.error.message
    );
  }
  if (tasksRes.error) {
    console.error("fetchContactRelatedCounts tasks:", tasksRes.error.message);
  }

  const quoteMap = countByContactId(quotesRes.data);
  const eventMap = countByContactId(eventsRes.data);
  const taskMap = countByContactId(tasksRes.data);

  const result = new Map<string, ContactRelatedCounts>();
  for (const id of uniqueIds) {
    result.set(id, {
      quotes: quoteMap.get(id) ?? 0,
      appointments: eventMap.get(id) ?? 0,
      tasks: taskMap.get(id) ?? 0,
    });
  }
  return result;
}
