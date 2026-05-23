import { createServerSideClient } from "@/lib/supabase";
import { logEmailContactActivity } from "@/lib/activities/log-email-activity";
import { saveContactEmail } from "@/lib/emails/save-contact-email";
import { extractEmailAddress } from "@/lib/google/extract-email-address";
import {
  isDirectConversation,
  isSameEmailAsUser,
} from "@/lib/google/gmail-conversation-filter";
import {
  emailDirection,
  parseGmailApiMessage,
} from "@/lib/google/gmail-message";
import {
  getGoogleGmailAccessToken,
  getGoogleGmailConnectedEmail,
} from "@/lib/google/gmail";

const MAX_MESSAGES = 50;
/** Only search recent mail unless we're continuing a known CRM thread. */
const RECENCY = "newer_than:2y";

type GmailListResponse = {
  messages?: Array<{ id: string; threadId?: string }>;
};

type GmailThreadResponse = {
  messages?: Array<{ id: string }>;
};

type GmailMessageResponse = {
  id: string;
  threadId?: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
    mimeType?: string;
    body?: { data?: string };
    parts?: unknown[];
  };
};

export type GmailSyncResult = {
  synced: number;
  listed: number;
  contact_email: string;
  error?: string;
  needs_reauth?: boolean;
  hint?: string;
  pruned?: number;
};

/** Gmail search: only direct mail between me and this contact (not cc-only / whole mailbox). */
function buildSearchQueries(contactEmail: string): string[] {
  const bare =
    extractEmailAddress(contactEmail) || contactEmail.trim().toLowerCase();
  const direct = `(from:me to:${bare}) OR (from:${bare} to:me)`;
  return [`${direct} ${RECENCY}`];
}

async function listMessageIds(
  accessToken: string,
  query: string
): Promise<{ ids: string[]; error?: string; status?: number }> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${MAX_MESSAGES}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    return { ids: [], error: await res.text(), status: res.status };
  }

  const list = (await res.json()) as GmailListResponse;
  return { ids: (list.messages ?? []).map((m) => m.id) };
}

async function listThreadMessageIds(
  accessToken: string,
  threadId: string
): Promise<string[]> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=minimal`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return [];

  const thread = (await res.json()) as GmailThreadResponse;
  return (thread.messages ?? []).map((m) => m.id);
}

async function fetchParsedMessage(
  accessToken: string,
  messageId: string
): Promise<ReturnType<typeof parseGmailApiMessage> | null> {
  const msgRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!msgRes.ok) return null;

  const raw = (await msgRes.json()) as GmailMessageResponse;
  return parseGmailApiMessage(
    raw as Parameters<typeof parseGmailApiMessage>[0]
  );
}

async function fetchAndSaveMessage(
  accessToken: string,
  messageId: string,
  userId: string,
  contactId: string,
  contactEmail: string,
  userEmail: string,
  supabase: ReturnType<typeof createServerSideClient>
): Promise<{ saved: boolean; storageError?: string }> {
  const parsed = await fetchParsedMessage(accessToken, messageId);
  if (!parsed) return { saved: false };

  if (!isDirectConversation(parsed, userEmail, contactEmail)) {
    return { saved: false };
  }

  const direction = emailDirection(parsed.from, userEmail, contactEmail);

  const { data: existingRow } = await supabase
    .from("contact_emails")
    .select("id")
    .eq("user_id", userId)
    .eq("gmail_message_id", parsed.id)
    .maybeSingle();

  const isNew = !existingRow?.id;

  try {
    await saveContactEmail(supabase, {
      user_id: userId,
      contact_id: contactId,
      direction,
      gmail_message_id: parsed.id,
      gmail_thread_id: parsed.threadId ?? null,
      from_email: extractEmailAddress(parsed.from) || parsed.from,
      to_email: parsed.to,
      subject: parsed.subject,
      body: parsed.body,
      sent_at: parsed.sentAt,
    });

    if (isNew) {
      await logEmailContactActivity(supabase, {
        userId,
        contactId,
        direction,
        subject: parsed.subject,
        body: parsed.body,
        to: parsed.to,
        from: extractEmailAddress(parsed.from) || parsed.from,
        gmail_message_id: parsed.id,
        gmail_thread_id: parsed.threadId ?? null,
      });
    }

    return { saved: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { saved: false, storageError: message };
  }
}

/** Remove previously synced rows that are not a direct user ↔ contact conversation. */
async function pruneInvalidStoredEmails(
  accessToken: string,
  userId: string,
  contactId: string,
  contactEmail: string,
  userEmail: string,
  supabase: ReturnType<typeof createServerSideClient>
): Promise<number> {
  const { data: stored } = await supabase
    .from("contact_emails")
    .select("id, gmail_message_id")
    .eq("user_id", userId)
    .eq("contact_id", contactId);

  let pruned = 0;

  for (const row of stored ?? []) {
    const parsed = await fetchParsedMessage(
      accessToken,
      row.gmail_message_id as string
    );
    if (parsed && isDirectConversation(parsed, userEmail, contactEmail)) {
      continue;
    }

    await supabase.from("contact_emails").delete().eq("id", row.id);

    await supabase
      .from("activities")
      .delete()
      .eq("contact_id", contactId)
      .eq("type", "email")
      .filter("metadata->>gmail_message_id", "eq", row.gmail_message_id);

    pruned += 1;
  }

  return pruned;
}

export async function syncContactEmailsFromGmail(
  userId: string,
  contactId: string,
  contactEmail: string
): Promise<GmailSyncResult> {
  const bareContact =
    extractEmailAddress(contactEmail) || contactEmail.trim().toLowerCase();

  const accessToken = await getGoogleGmailAccessToken(userId);
  const userEmail = await getGoogleGmailConnectedEmail(userId);

  if (!accessToken || !userEmail) {
    return {
      synced: 0,
      listed: 0,
      contact_email: bareContact,
      error: "Gmail is not connected. Connect in Settings → Integrations.",
    };
  }

  const supabase = createServerSideClient();
  const pruned = await pruneInvalidStoredEmails(
    accessToken,
    userId,
    contactId,
    contactEmail,
    userEmail,
    supabase
  );

  const messageIdSet = new Set<string>();
  const sameAsUser = isSameEmailAsUser(userEmail, contactEmail);

  if (!sameAsUser) {
    for (const query of buildSearchQueries(contactEmail)) {
      const { ids, error, status } = await listMessageIds(accessToken, query);
      if (status === 403) {
        return {
          synced: 0,
          listed: 0,
          contact_email: bareContact,
          pruned,
          error:
            "Gmail read access missing. Use Reconnect Gmail and approve all permissions.",
          needs_reauth: true,
        };
      }
      if (error && messageIdSet.size === 0) {
        console.error("Gmail list failed:", error);
      }
      ids.forEach((id) => messageIdSet.add(id));
      if (messageIdSet.size >= MAX_MESSAGES) break;
    }
  }

  const { data: knownThreads } = await supabase
    .from("contact_emails")
    .select("gmail_thread_id")
    .eq("user_id", userId)
    .eq("contact_id", contactId)
    .not("gmail_thread_id", "is", null);

  for (const row of knownThreads ?? []) {
    if (!row.gmail_thread_id) continue;
    const threadIds = await listThreadMessageIds(
      accessToken,
      row.gmail_thread_id as string
    );
    threadIds.forEach((id) => messageIdSet.add(id));
  }

  const listed = messageIdSet.size;

  if (sameAsUser && listed === 0) {
    return {
      synced: 0,
      listed: 0,
      contact_email: bareContact,
      pruned,
      hint:
        "This contact uses the same email as your connected Gmail. Use a different contact email, or send from the CRM first so we can track that thread.",
    };
  }

  if (listed === 0) {
    return {
      synced: 0,
      listed: 0,
      contact_email: bareContact,
      pruned,
      hint:
        `No direct Gmail conversation found with ${bareContact} in the last 2 years. ` +
        "Only messages between you and this contact sync—not forwards, newsletters, or mail where they're only copied.",
    };
  }

  let synced = 0;
  let storageError: string | undefined;

  for (const id of messageIdSet) {
    const result = await fetchAndSaveMessage(
      accessToken,
      id,
      userId,
      contactId,
      contactEmail,
      userEmail,
      supabase
    );
    if (result.saved) synced += 1;
    if (result.storageError) storageError = result.storageError;
  }

  if (synced === 0 && storageError) {
    const needsMigration = /does not exist|relation/i.test(storageError);
    return {
      synced: 0,
      listed,
      contact_email: bareContact,
      pruned,
      error: needsMigration
        ? "Run migration 019_contact_emails.sql in Supabase, then sync again."
        : `Could not save messages: ${storageError}`,
    };
  }

  if (synced === 0) {
    return {
      synced: 0,
      listed,
      contact_email: bareContact,
      pruned,
      hint:
        `Gmail returned ${listed} candidate message(s) but none were a direct exchange with ${bareContact}. ` +
        "Forwards and unrelated mail are excluded.",
    };
  }

  return { synced, listed, contact_email: bareContact, pruned };
}
