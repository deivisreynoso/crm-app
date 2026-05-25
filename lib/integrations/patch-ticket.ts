import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTicketUpdate } from "@/lib/ticket-payload";
import { enrichTicket } from "@/lib/ticket-queries";
import { ticketPatchSchema } from "@/lib/validators";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";

export type PatchTicketResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; error: string; details?: unknown };

export async function patchTicketForIntegration(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  id: string,
  body: unknown
): Promise<PatchTicketResult> {
  const parsed = ticketPatchSchema.safeParse(body);
  if (!parsed.success) {
    const detailStr = formatValidationDetails(parsed.error.flatten());
    return {
      ok: false,
      status: 400,
      error: detailStr || "Validation failed",
      details: parsed.error.flatten(),
    };
  }

  const { data, error: dbError } = await supabase
    .from("tickets")
    .update({
      ...buildTicketUpdate(parsed.data),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", workspaceOwnerId)
    .select("*")
    .single();

  if (dbError) {
    const status = /duplicate|unique/i.test(dbError.message) ? 409 : 500;
    return {
      ok: false,
      status,
      error: humanizeDbError(dbError.message),
    };
  }

  if (!data) {
    return { ok: false, status: 404, error: "Service ticket not found" };
  }

  const enriched = (await enrichTicket(data)) as Record<string, unknown>;
  return { ok: true, data: enriched };
}
