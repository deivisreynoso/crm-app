import type { User } from "@supabase/supabase-js";
import { formatAuthorDisplayName } from "@/lib/users/author-display-name";

export function displayNameFromAuthUser(user: User): string | null {
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;

  return formatAuthorDisplayName({
    fullName,
    email: user.email,
  });
}
