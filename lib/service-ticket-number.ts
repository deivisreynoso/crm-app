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

export function isTicketNumberConflict(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("ticket_number") ||
    (lower.includes("duplicate key") && lower.includes("tickets"))
  );
}

export function ticketDisplayLabel(ticket: {
  subject?: string | null;
  title?: string | null;
  ticket_number?: string | null;
}): string {
  return (
    ticket.subject?.trim() ||
    ticket.title?.trim() ||
    ticket.ticket_number ||
    "Service ticket"
  );
}

/** Notification line for a ticket — never includes literal "undefined". */
export function formatTicketNotificationMessage(ticket: {
  subject?: string | null;
  title?: string | null;
  ticket_number?: string | null;
}): string {
  const subject =
    ticket.subject?.trim() ||
    ticket.title?.trim() ||
    "Service ticket";
  const ref = ticket.ticket_number?.trim();
  return ref ? `${ref}: ${subject}` : subject;
}

export function formatServiceTicketLabel(ticketNumber?: string | null) {
  return ticketNumber ? `Service Ticket # ${ticketNumber}` : "Service Ticket";
}
