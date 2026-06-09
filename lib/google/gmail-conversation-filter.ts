import {
  extractEmailAddress,
  parseAddressList,
} from "@/lib/google/extract-email-address";
import type { ParsedGmailMessage } from "@/lib/google/gmail-message";

const AUTOMATED_FROM =
  /(?:^|@)(?:noreply|no-reply|donotreply|notifications?|mailer-daemon|postmaster)\b/i;

/** True when both the connected user and contact appear in From/To/Cc/Reply-To. */
export function involvesContactAndUser(
  parsed: ParsedGmailMessage,
  userEmail: string,
  contactEmail: string
): boolean {
  const user = extractEmailAddress(userEmail);
  const contact = extractEmailAddress(contactEmail);
  if (!user || !contact || user === contact) return false;

  const parties = new Set<string>();
  const from = extractEmailAddress(parsed.from);
  if (from) parties.add(from);
  for (const addr of [
    ...parseAddressList(parsed.to),
    ...parseAddressList(parsed.cc),
    ...parseAddressList(parsed.replyTo),
  ]) {
    parties.add(addr);
  }

  return parties.has(user) && parties.has(contact);
}

/** True only for a direct 1:1-style exchange between the connected user and this contact. */
export function isDirectConversation(
  parsed: ParsedGmailMessage,
  userEmail: string,
  contactEmail: string
): boolean {
  if (!involvesContactAndUser(parsed, userEmail, contactEmail)) return false;

  const user = extractEmailAddress(userEmail);
  const contact = extractEmailAddress(contactEmail);
  if (!user || !contact) return false;

  const from = extractEmailAddress(parsed.from);
  const toList = parseAddressList(parsed.to);
  const ccList = parseAddressList(parsed.cc);

  if (!from || AUTOMATED_FROM.test(from)) return false;
  if (from !== user && from !== contact) return false;

  const subject = parsed.subject.trim();
  if (/^fwd?:/i.test(subject)) return false;
  if (parsed.body.includes("---------- Forwarded message ---------")) return false;

  if (from === user) {
    return toList.includes(contact);
  }

  return toList.includes(user) || ccList.includes(user);
}

export function isSameEmailAsUser(
  userEmail: string,
  contactEmail: string
): boolean {
  const user = extractEmailAddress(userEmail);
  const contact = extractEmailAddress(contactEmail);
  return Boolean(user && contact && user === contact);
}
