/** Canonical public site origin (no trailing slash). */
export function getSiteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ??
    "https://www.clickin360.com"
  );
}

export const MARKETING_PAGE_SLUGS = [
  "about",
  "book-call",
  "contact",
  "how-it-works",
  "offers",
  "privacy",
  "services",
] as const;

/** Paths that must not be indexed (CRM, auth, APIs). */
export const CRM_ROBOTS_DISALLOW = [
  "/api/",
  "/dashboard",
  "/contacts",
  "/opportunities",
  "/tickets",
  "/pipelines",
  "/calendar",
  "/documents",
  "/payments",
  "/analytics",
  "/account",
  "/settings",
  "/quotes",
  "/services",
  "/attachments",
  "/accounts",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/",
  "/quote/",
];
