import type { createServerSideClient } from "@/lib/supabase";
import { formatAuthorDisplayName } from "@/lib/users/author-display-name";

export async function ensureUserProfile(
  supabase: ReturnType<typeof createServerSideClient>,
  input: {
    userId: string;
    email?: string | null;
    displayName?: string | null;
  }
) {
  const email = input.email?.trim();
  if (!email) return;

  const displayName =
    formatAuthorDisplayName({
      displayName: input.displayName,
      fullName: input.displayName,
      email,
    }) ?? email;

  await supabase.from("user_profiles").upsert(
    {
      id: input.userId,
      email,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}
