import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSideClient } from "@/lib/supabase";

export async function verifyContactInWorkspace(
  workspaceOwnerId: string,
  contactId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase ?? createServerSideClient();
  const { data } = await client
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();
  return !!data;
}
