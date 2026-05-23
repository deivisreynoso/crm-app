export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function getUserDisplayName(user: {
  name?: string | null;
  email?: string | null;
}): { firstName: string; displayName: string } {
  const name = user.name?.trim();
  const email = user.email?.trim();

  if (name && !name.includes("@")) {
    const firstName = name.split(/\s+/)[0] ?? name;
    return { firstName, displayName: name };
  }

  if (email) {
    const local = email.split("@")[0] ?? "there";
    const firstName =
      local.split(/[._-]/)[0]?.replace(/\d+/g, "") || "there";
    const formatted =
      firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    return { firstName: formatted, displayName: formatted };
  }

  return { firstName: "there", displayName: "there" };
}

export function getUserInitials(user: {
  name?: string | null;
  email?: string | null;
}): string {
  const name = user.name?.trim();
  if (name && !name.includes("@")) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const email = user.email?.trim();
  if (email) {
    const local = email.split("@")[0] ?? "";
    return local.slice(0, 2).toUpperCase() || "U";
  }
  return "U";
}
