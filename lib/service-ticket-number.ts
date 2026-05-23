import { createServerSideClient } from "@/lib/supabase";

/** Format: ST-0001, ST-0002, … per user */
export async function generateServiceTicketNumber(userId: string): Promise<string> {
  const supabase = createServerSideClient();
  const { data } = await supabase
    .from("tickets")
    .select("ticket_number")
    .eq("user_id", userId)
    .not("ticket_number", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);

  let max = 0;
  for (const row of data ?? []) {
    const match = row.ticket_number?.match(/^ST-(\d+)$/i);
    if (match) {
      max = Math.max(max, parseInt(match[1], 10));
    }
  }

  return `ST-${String(max + 1).padStart(4, "0")}`;
}

export function formatServiceTicketLabel(ticketNumber?: string | null) {
  return ticketNumber ? `Service Ticket # ${ticketNumber}` : "Service Ticket";
}
