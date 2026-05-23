// ClickIn 360 business-specific contact field options.
// Adjust these when productizing for other clients.

export const PREFERRED_CONTACT_METHODS = [
  "Email",
  "Phone",
  "SMS",
  "WhatsApp",
  "In person",
] as const;

export const TIMEZONE_OPTIONS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Mexico_City",
  "America/Monterrey",
  "America/Tijuana",
  "UTC",
] as const;

export const PLATFORM_OPTIONS = [
  "Website",
  "Facebook",
  "Instagram",
  "Google",
  "Referral",
  "Walk-in",
  "Other",
] as const;

export function formatTimezone(tz: string): string {
  return tz.replace(/_/g, " ").replace("America/", "");
}
