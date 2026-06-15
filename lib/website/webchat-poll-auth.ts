import { createHmac, timingSafeEqual } from "crypto";

const POLL_SECRET_KEY = "webchat_poll_secret";
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

type PendingEntry = { hash: string; expiresAt: number };

const pendingBySession = new Map<string, PendingEntry>();

function serverKey(): string {
  const key =
    process.env.WEBCHAT_POLL_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error("WEBCHAT_POLL_SECRET or NEXTAUTH_SECRET must be set");
  }
  return key;
}

function pendingKey(workspaceOwnerId: string, sessionId: string): string {
  return `${workspaceOwnerId}:${sessionId}`;
}

export function hashWebchatPollSecret(sessionSecret: string): string {
  return createHmac("sha256", serverKey()).update(sessionSecret).digest("hex");
}

export function registerWebchatPollSecret(
  workspaceOwnerId: string,
  sessionId: string,
  sessionSecret: string
): void {
  const hash = hashWebchatPollSecret(sessionSecret);
  pendingBySession.set(pendingKey(workspaceOwnerId, sessionId), {
    hash,
    expiresAt: Date.now() + PENDING_TTL_MS,
  });
}

export function consumePendingPollSecret(
  workspaceOwnerId: string,
  sessionId: string
): string | null {
  const key = pendingKey(workspaceOwnerId, sessionId);
  const entry = pendingBySession.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    pendingBySession.delete(key);
    return null;
  }
  pendingBySession.delete(key);
  return entry.hash;
}

export function verifyWebchatPollSecret(
  sessionSecret: string,
  storedHash: string | null | undefined
): boolean {
  if (!storedHash || !sessionSecret) return false;
  const expected = hashWebchatPollSecret(sessionSecret);
  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(storedHash, "hex")
    );
  } catch {
    return false;
  }
}

export function pollSecretFromQualification(
  qualification: Record<string, unknown> | null | undefined
): string | null {
  const value = qualification?.[POLL_SECRET_KEY];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function qualificationWithPollSecret(
  qualification: Record<string, unknown> | null | undefined,
  hash: string
): Record<string, unknown> {
  return { ...(qualification ?? {}), [POLL_SECRET_KEY]: hash };
}
