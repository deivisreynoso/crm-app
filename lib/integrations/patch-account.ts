import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { formatValidationDetails } from "@/lib/validation-errors";

export const accountPatchSchema = z.object({
  name: z.string().min(1).optional(),
  website: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  industry: z.string().optional().or(z.literal("")),
  company_size: z.string().optional().or(z.literal("")),
  revenue: z.string().optional().or(z.literal("")),
  account_summary: z.string().optional().or(z.literal("")),
});

export type PatchAccountResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; error: string; details?: unknown };

function emptyToNull(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

export async function patchAccountForIntegration(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  id: string,
  body: unknown
): Promise<PatchAccountResult> {
  const parsed = accountPatchSchema.safeParse(body);
  if (!parsed.success) {
    const detailStr = formatValidationDetails(parsed.error.flatten());
    return {
      ok: false,
      status: 400,
      error: detailStr || "Validation failed",
      details: parsed.error.flatten(),
    };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
  if (parsed.data.website !== undefined) updates.website = emptyToNull(parsed.data.website);
  if (parsed.data.phone !== undefined) updates.phone = emptyToNull(parsed.data.phone);
  if (parsed.data.industry !== undefined) updates.industry = emptyToNull(parsed.data.industry);
  if (parsed.data.company_size !== undefined) {
    updates.company_size = emptyToNull(parsed.data.company_size);
  }
  if (parsed.data.revenue !== undefined) updates.revenue = emptyToNull(parsed.data.revenue);
  if (parsed.data.account_summary !== undefined) {
    updates.account_summary = emptyToNull(parsed.data.account_summary);
  }

  const fieldKeys = Object.keys(updates).filter((k) => k !== "updated_at");
  if (fieldKeys.length === 0) {
    return { ok: false, status: 400, error: "No changes provided" };
  }

  const { data, error: dbError } = await supabase
    .from("companies")
    .update(updates)
    .eq("id", id)
    .eq("user_id", workspaceOwnerId)
    .select()
    .single();

  if (dbError) {
    return { ok: false, status: 500, error: dbError.message };
  }

  if (!data) {
    return { ok: false, status: 404, error: "Account not found" };
  }

  return { ok: true, data: data as Record<string, unknown> };
}
