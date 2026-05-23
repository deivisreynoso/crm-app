const FRIENDLY_FIELD_LABELS: Record<string, string> = {
  contact_id: "Contact",
  company_id: "Account",
  opportunity_id: "Opportunity",
  field_name: "Field name",
  title: "Title",
  end_time: "End time",
};

/** Turn raw Postgres / API messages into plain language. */
export function humanizeDbError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("custom_fields_user_id_entity_type_field_name")) {
    return (
      "A field with this name already exists on this object type. " +
      "The same name can be used on Contacts and Opportunities separately — only duplicate names on the same object are blocked."
    );
  }
  if (lower.includes("calendar_events_parent_check")) {
    return "Link this event to an account or a contact.";
  }
  if (lower.includes("documents_parent_check")) {
    return "This document could not be saved. Try linking a contact or run the latest database migration.";
  }
  if (lower.includes("duplicate key") && lower.includes("email")) {
    return "A contact with this email address already exists. Use the existing record or enter a different email.";
  }
  if (lower.includes("duplicate key") && lower.includes("phone")) {
    return "A contact with this phone number already exists. Use the existing record or enter a different number.";
  }
  if (lower.includes("notification_preferences")) {
    if (lower.includes('null value in column "id"')) {
      return "Notification settings could not be saved. Refresh the page and try again.";
    }
    if (
      lower.includes("on conflict") ||
      lower.includes("unique or exclusion constraint")
    ) {
      return "Notification settings could not be saved. Run migrations 010 and 015 in Supabase, then try again.";
    }
    if (lower.includes("updated_at") || lower.includes("schema cache")) {
      return "Notification settings could not be saved. Run migration 010 in Supabase, then try again.";
    }
  }
  if (lower.includes("on conflict") || lower.includes("unique or exclusion constraint")) {
    return "Your settings could not be saved. A database update may be required — run the latest migrations in Supabase.";
  }
  if (lower.includes("schema cache") || lower.includes("could not find")) {
    return "A required database update is missing. Please run the latest migrations in Supabase.";
  }
  if (lower.includes("violates foreign key")) {
    return "A linked record was removed or is invalid. Refresh the page and try again.";
  }
  if (lower.includes("invalid input syntax for type uuid")) {
    return "A selected record is invalid. Refresh and try again.";
  }

  return message;
}

export function formatValidationDetails(details: unknown): string {
  if (!details || typeof details !== "object") return "";

  const flat = details as {
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
  };

  const messages: string[] = [...(flat.formErrors ?? [])];

  for (const [field, errors] of Object.entries(flat.fieldErrors ?? {})) {
    if (!errors?.length) continue;
    const msg = errors.join(", ");
    if (
      msg.startsWith("Select ") ||
      msg.startsWith("Link ") ||
      msg.startsWith("End time") ||
      msg.startsWith("Add at least") ||
      !field.includes("_")
    ) {
      messages.push(msg);
      continue;
    }
    const label = FRIENDLY_FIELD_LABELS[field] ?? field.replace(/_/g, " ");
    messages.push(`${label}: ${msg}`);
  }

  return messages.filter(Boolean).join(". ");
}

export function formatApiError(err: unknown, fallback = "Something went wrong"): string {
  if (err && typeof err === "object" && "response" in err) {
    const axiosErr = err as {
      response?: { data?: { error?: string; details?: unknown; hint?: string } };
    };
    const body = axiosErr.response?.data;
    const rawError = body?.error ?? "";
    const friendlyError = rawError ? humanizeDbError(rawError) : "";
    const detailStr = formatValidationDetails(body?.details);
    const hint = body?.hint?.includes("migration")
      ? "A database update may be required — ask your admin to run the latest migrations."
      : undefined;
    return (
      [friendlyError, detailStr, hint].filter(Boolean).join(" ") || fallback
    );
  }
  if (err instanceof Error) return humanizeDbError(err.message);
  return fallback;
}
