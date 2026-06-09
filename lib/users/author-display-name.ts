import { getUserDisplayName } from "@/lib/user-display";

function isUsablePersonName(value?: string | null): value is string {
  const trimmed = value?.trim();
  return !!trimmed && !trimmed.includes("@");
}

/** Prefer stored full name; only derive from email when no real name exists. */
export function formatAuthorDisplayName(input: {
  displayName?: string | null;
  fullName?: string | null;
  email?: string | null;
}): string | null {
  if (isUsablePersonName(input.fullName)) return input.fullName.trim();
  if (isUsablePersonName(input.displayName)) return input.displayName.trim();

  const { displayName } = getUserDisplayName({
    name: null,
    email: input.email,
  });
  return displayName || null;
}
