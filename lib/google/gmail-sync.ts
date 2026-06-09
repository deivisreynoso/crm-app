import { createServerSideClient } from "@/lib/supabase";
import { logEmailContactActivity } from "@/lib/activities/log-email-activity";
import { saveContactEmail } from "@/lib/emails/save-contact-email";
import { extractEmailAddress } from "@/lib/google/extract-email-address";
import {
  involvesContactAndUser,
  isDirectConversation,
  isSameEmailAsUser,
} from "@/lib/google/gmail-conversation-filter";
import {
  emailDirection,
  parseGmailApiMessage,
} from "@/lib/google/gmail-message";
import { notifyInboundEmail } from "@/lib/notifications/notify-inbound-email";
import {
  getGoogleGmailAccessToken,
  getGoogleGmailConnectedEmail,
} from "@/lib/google/gmail";

const MAX_MESSAGES = 50;
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
  workspaceOwnerId: string,
  mailboxUserId: string,
  contactId: string,
  contactEmail: string,
  contactName: string,
  userEmail: string,
  supabase: ReturnType<typeof createServerSideClient>,
  options?: { fromKnownThread?: boolean }
): Promise<{ saved: boolean; storageError?: string }> {
  const parsed = await fetchParsedMessage(accessToken, messageId);
  if (!parsed) return { saved: false };

  const allowed = options?.fromKnownThread
    ? involvesContactAndUser(parsed, userEmail, contactEmail)
    : isDirectConversation(parsed, userEmail, contactEmail);

  if (!allowed) return { saved: false };

  const direction = emailDirection(parsed.from, userEmail, contactEmail);

  const { data: existingRow } = await supabase
    .from("contact_emails")
    .select("id")
    .eq("user_id", workspaceOwnerId)
    .eq("gmail_message_id", parsed.id)
    .maybeSingle();

  const isNew = !existingRow?.id;

  try {
    await saveContactEmail(supabase, {
      user_id: workspaceOwnerId,
      contact_id: contactId,
      mailbox_user_id: mailboxUserId,
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
        userId: workspaceOwnerId,
        createdBy: mailboxUserId,
        contactId,
        direction,
        subject: parsed.subject,
        body: parsed.body,
        to: parsed.to,
        from: extractEmailAddress(parsed.from) || parsed.from,
        gmail_message_id: parsed.id,
        gmail_thread_id: parsed.threadId ?? null,
      });

      if (direction === "inbound") {
        void notifyInboundEmail(supabase, {
          recipientUserId: mailboxUserId,
          contactId,
          contactName,
          subject: parsed.subject,
        }).catch((err) => {
          console.error("notifyInboundEmail:", err);
        });
      }
    }

    return { saved: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { saved: false, storageError: message };
  }
}

async function pruneInvalidStoredEmails(
  accessToken: string,
  workspaceOwnerId: string,
  mailboxUserId: string,
  contactId: string,
  contactEmail: string,
  userEmail: string,
  supabase: ReturnType<typeof createServerSideClient>
): Promise<number> {
  const { data: stored } = await supabase
    .from("contact_emails")
    .select("id, gmail_message_id, mailbox_user_id")
    .eq("user_id", workspaceOwnerId)
    .eq("contact_id", contactId)
    .or(`mailbox_user_id.is.null,mailbox_user_id.eq.${mailboxUserId}`);

  let pruned = 0;

  for (const row of stored ?? []) {
    if (row.mailbox_user_id && row.mailbox_user_id !== mailboxUserId) {
      continue;
    }

    const parsed = await fetchParsedMessage(
      accessToken,
      row.gmail_message_id as string
    );
    if (
      parsed &&
      (isDirectConversation(parsed, userEmail, contactEmail) ||
        involvesContactAndUser(parsed, userEmail, contactEmail))
    ) {
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

type StoredThreadRow = {
  gmail_thread_id: string | null;
  mailbox_user_id: string | null;
};

async function syncFromMailbox(
  mailboxUserId: string,
  workspaceOwnerId: string,
  contactId: string,
  contactEmail: string,
  contactName: string,
  threadIds: Set<string>
): Promise<{
  synced: number;
  listed: number;
  pruned: number;
  error?: string;
  needs_reauth?: boolean;
  storageError?: string;
}> {
  const accessToken = await getGoogleGmailAccessToken(mailboxUserId);
  const userEmail = await getGoogleGmailConnectedEmail(mailboxUserId);

  if (!accessToken || !userEmail) {
    return { synced: 0, listed: 0, pruned: 0 };
  }

  const supabase = createServerSideClient();
  const pruned = await pruneInvalidStoredEmails(
    accessToken,
    workspaceOwnerId,
    mailboxUserId,
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

  for (const threadId of threadIds) {
    const threadMessageIds = await listThreadMessageIds(accessToken, threadId);
    threadMessageIds.forEach((id) => messageIdSet.add(id));
  }

  const listed = messageIdSet.size;
  let synced = 0;
  let storageError: string | undefined;

  for (const id of messageIdSet) {
    const parsed = await fetchParsedMessage(accessToken, id);
    const fromKnownThread = Boolean(
      parsed?.threadId && threadIds.has(parsed.threadId)
    );

    const result = await fetchAndSaveMessage(
      accessToken,
      id,
      workspaceOwnerId,
      mailboxUserId,
      contactId,
      contactEmail,
      contactName,
      userEmail,
      supabase,
      { fromKnownThread }
    );
    if (result.saved) synced += 1;
    if (result.storageError) storageError = result.storageError;
  }

  return { synced, listed, pruned, storageError };
}

function collectMailboxUsers(
  actorUserId: string,
  storedRows: StoredThreadRow[]
): Set<string> {
  const users = new Set<string>([actorUserId]);
  for (const row of storedRows) {
    if (row.mailbox_user_id) users.add(row.mailbox_user_id);
  }
  return users;
}

function collectThreadIdsForMailbox(
  mailboxUserId: string,
  actorUserId: string,
  storedRows: StoredThreadRow[]
): Set<string> {
  const threads = new Set<string>();
  for (const row of storedRows) {
    if (!row.gmail_thread_id) continue;
    const owner = row.mailbox_user_id ?? actorUserId;
    if (owner === mailboxUserId) {
      threads.add(row.gmail_thread_id);
    }
  }
  return threads;
}

/**
 * Pull Gmail messages for a contact into shared workspace storage.
 * Uses the actor's mailbox plus any teammate mailboxes that sent CRM email in this thread.
 */
export async function syncContactEmailsFromGmail(
  actorUserId: string,
  workspaceOwnerId: string,
  contactId: string,
  contactEmail: string,
  contactName?: string
): Promise<GmailSyncResult> {
  const bareContact =
    extractEmailAddress(contactEmail) || contactEmail.trim().toLowerCase();
  const displayName = contactName?.trim() || bareContact;

  const actorEmail = await getGoogleGmailConnectedEmail(actorUserId);
  if (!actorEmail) {
    return {
      synced: 0,
      listed: 0,
      contact_email: bareContact,
      error: "Gmail is not connected. Connect in Settings → Integrations.",
    };
  }

  const supabase = createServerSideClient();
  const { data: storedRows } = await supabase
    .from("contact_emails")
    .select("gmail_thread_id, mailbox_user_id")
    .eq("user_id", workspaceOwnerId)
    .eq("contact_id", contactId);

  const rows = (storedRows ?? []) as StoredThreadRow[];
  const mailboxUsers = collectMailboxUsers(actorUserId, rows);

  let totalSynced = 0;
  let totalListed = 0;
  let totalPruned = 0;
  let lastError: string | undefined;
  let needsReauth = false;
  let storageError: string | undefined;

  for (const mailboxUserId of mailboxUsers) {
    const threadIds = collectThreadIdsForMailbox(
      mailboxUserId,
      actorUserId,
      rows
    );
    const result = await syncFromMailbox(
      mailboxUserId,
      workspaceOwnerId,
      contactId,
      contactEmail,
      displayName,
      threadIds
    );

    totalSynced += result.synced;
    totalListed += result.listed;
    totalPruned += result.pruned;
    if (result.error) lastError = result.error;
    if (result.needs_reauth) needsReauth = true;
    if (result.storageError) storageError = result.storageError;
  }

  if (lastError && totalSynced === 0) {
    return {
      synced: 0,
      listed: totalListed,
      contact_email: bareContact,
      pruned: totalPruned,
      error: lastError,
      needs_reauth: needsReauth,
    };
  }

  const sameAsUser = isSameEmailAsUser(actorEmail, contactEmail);

  if (sameAsUser && totalListed === 0 && rows.length === 0) {
    return {
      synced: 0,
      listed: 0,
      contact_email: bareContact,
      pruned: totalPruned,
      hint:
        "This contact uses the same email as your connected Gmail. Send from the CRM first so we can track that thread.",
    };
  }

  if (totalListed === 0 && rows.length === 0) {
    return {
      synced: 0,
      listed: 0,
      contact_email: bareContact,
      pruned: totalPruned,
      hint:
        `No direct Gmail conversation found with ${bareContact} in the last 2 years. ` +
        "Send from the CRM or sync after the contact replies to your email.",
    };
  }

  if (totalSynced === 0 && storageError) {
    const needsMigration = /does not exist|relation/i.test(storageError);
    return {
      synced: 0,
      listed: totalListed,
      contact_email: bareContact,
      pruned: totalPruned,
      error: needsMigration
        ? "Run migrations 019_contact_emails.sql and 046_contact_emails_mailbox_user.sql in Supabase."
        : `Could not save messages: ${storageError}`,
    };
  }

  if (totalSynced === 0 && totalListed > 0) {
    return {
      synced: 0,
      listed: totalListed,
      contact_email: bareContact,
      pruned: totalPruned,
      hint:
        `Gmail returned ${totalListed} candidate message(s) but none matched this contact thread yet. ` +
        "If they just replied, wait a moment and sync again.",
    };
  }

  return {
    synced: totalSynced,
    listed: totalListed,
    contact_email: bareContact,
    pruned: totalPruned,
  };
}
