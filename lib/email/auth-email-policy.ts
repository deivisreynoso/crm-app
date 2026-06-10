import { resolvePublicAppOrigin } from "@/lib/auth/app-url";
import { isMailgunConfigured } from "@/lib/email/mailgun-config";

/** Production CRM hosts should send auth email via Mailgun (cross-device reset links). */
export function isProductionAppHost(): boolean {
  const origin = resolvePublicAppOrigin();
  try {
    const { hostname } = new URL(origin);
    return (
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      hostname !== "0.0.0.0"
    );
  } catch {
    return false;
  }
}

/** Password reset and invites must use Mailgun on production. */
export function requireTransactionalEmailForAuth(): void {
  if (!isProductionAppHost()) return;
  if (isMailgunConfigured()) return;
  throw new Error(
    "MAILGUN_API_KEY, MAILGUN_DOMAIN, and MAILGUN_FROM are required in production for password reset and team invites."
  );
}
