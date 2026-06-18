import { createServerSideClient } from "@/lib/supabase";
import { getClickIn360OrgUserIdOptional } from "@/lib/org/constants";

/** Whether the public CID support widget is enabled for the website workspace. */
export async function isSupportWidgetEnabled(): Promise<boolean> {
  const ownerId = getClickIn360OrgUserIdOptional();
  if (!ownerId) return false;

  const supabase = createServerSideClient();
  const { data } = await supabase
    .from("user_settings")
    .select("support_widget_enabled")
    .eq("user_id", ownerId)
    .maybeSingle();

  return data?.support_widget_enabled === true;
}
