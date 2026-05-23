import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalEmail, canonicalPhone } from "@/lib/identity/normalize";

export type DuplicateMatch = {
  field: "email" | "phone";
  contact: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
  };
};

export async function findDuplicateContact(
  supabase: SupabaseClient,
  userId: string,
  input: { email?: string | null; phone?: string | null; excludeId?: string }
): Promise<DuplicateMatch | null> {
  const targetEmail = canonicalEmail(input.email);
  const targetPhone = canonicalPhone(input.phone);

  if (targetEmail) {
    const { data: byEmail } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone")
      .eq("user_id", userId)
      .ilike("email", targetEmail);

    const emailMatch = (byEmail ?? []).find(
      (c) =>
        c.id !== input.excludeId && canonicalEmail(c.email) === targetEmail
    );
    if (emailMatch) {
      return { field: "email", contact: emailMatch };
    }
  }

  if (targetPhone) {
    const { data: withPhone } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone")
      .eq("user_id", userId)
      .not("phone", "is", null);

    const phoneMatch = (withPhone ?? []).find(
      (c) =>
        c.id !== input.excludeId && canonicalPhone(c.phone) === targetPhone
    );
    if (phoneMatch) {
      return { field: "phone", contact: phoneMatch };
    }
  }

  return null;
}

export function duplicateContactMessage(match: DuplicateMatch): string {
  const name = `${match.contact.first_name} ${match.contact.last_name}`.trim();
  if (match.field === "email") {
    return `A contact with this email address already exists (${name}). Use the existing record or enter a different email.`;
  }
  return `A contact with this phone number already exists (${name}). Use the existing record or enter a different number.`;
}
