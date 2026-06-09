import { getGmailReplyContext } from "@/lib/google/gmail-reply";
import type { GmailSendInput } from "@/lib/google/gmail";
import { normalizeRecipientList } from "@/lib/emails/parse-recipients";

export async function resolveGmailSendOptions(
  actorUserId: string,
  input: {
    cc?: string | null;
    reply_to_gmail_message_id?: string | null;
  }
): Promise<Pick<GmailSendInput, "cc" | "threadId" | "inReplyTo" | "references">> {
  const cc = normalizeRecipientList(input.cc);
  const options: Pick<
    GmailSendInput,
    "cc" | "threadId" | "inReplyTo" | "references"
  > = {};

  if (cc) options.cc = cc;

  if (input.reply_to_gmail_message_id) {
    const reply = await getGmailReplyContext(
      actorUserId,
      input.reply_to_gmail_message_id
    );
    if (reply?.threadId) options.threadId = reply.threadId;
    if (reply?.inReplyTo) options.inReplyTo = reply.inReplyTo;
    if (reply?.references) options.references = reply.references;
  }

  return options;
}

export function replySubject(subject: string | null | undefined): string {
  const trimmed = subject?.trim() ?? "";
  if (!trimmed) return "Re: (No subject)";
  if (/^re:/i.test(trimmed)) return trimmed;
  return `Re: ${trimmed}`;
}
