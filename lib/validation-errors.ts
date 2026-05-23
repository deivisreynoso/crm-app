export function formatValidationDetails(details: unknown): string {
  if (!details || typeof details !== "object") return "";

  const flat = details as {
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
  };

  const messages: string[] = [...(flat.formErrors ?? [])];

  for (const [field, errors] of Object.entries(flat.fieldErrors ?? {})) {
    if (errors?.length) {
      messages.push(`${field}: ${errors.join(", ")}`);
    }
  }

  return messages.filter(Boolean).join(". ");
}

export function formatApiError(err: unknown, fallback = "Something went wrong"): string {
  if (err && typeof err === "object" && "response" in err) {
    const axiosErr = err as {
      response?: { data?: { error?: string; details?: unknown; hint?: string } };
    };
    const body = axiosErr.response?.data;
    const detailStr = formatValidationDetails(body?.details);
    return (
      [body?.error, detailStr, body?.hint].filter(Boolean).join(" — ") || fallback
    );
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
