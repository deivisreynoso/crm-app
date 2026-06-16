import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveQuoteLogoUrl } from "@/lib/storage/quote-logo";

export type WorkspaceBranding = {
  company_name: string;
  primary_color: string;
  font_family: string;
  logo_url?: string | null;
};

export async function resolveWorkspaceBranding(
  supabase: SupabaseClient,
  workspaceOwnerId: string
): Promise<WorkspaceBranding> {
  const { data: settings } = await supabase
    .from("user_settings")
    .select(
      "quote_company_name, quote_primary_color, quote_font_family, quote_logo_storage_path"
    )
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  const logoUrl = await resolveQuoteLogoUrl(
    supabase,
    settings?.quote_logo_storage_path as string | null
  );

  return {
    company_name:
      (settings?.quote_company_name as string | null)?.trim() || "ClickIn 360",
    primary_color: (settings?.quote_primary_color as string | null) || "#1D9E75",
    font_family:
      (settings?.quote_font_family as string | null) || "system-ui, sans-serif",
    logo_url: logoUrl,
  };
}
