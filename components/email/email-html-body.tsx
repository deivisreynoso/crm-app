"use client";

import { cn } from "@/lib/utils";
import {
  emailBodyPlainText,
  isHtmlEmailBody,
  sanitizeEmailHtmlForDisplay,
} from "@/lib/email/html-body";

type EmailHtmlBodyProps = {
  body: string;
  className?: string;
};

export function EmailHtmlBody({ body, className }: EmailHtmlBodyProps) {
  if (!body.trim()) return null;

  if (!isHtmlEmailBody(body)) {
    return (
      <p className={cn("whitespace-pre-wrap leading-relaxed text-body", className)}>
        {body}
      </p>
    );
  }

  return (
    <div
      className={cn("email-html-body text-body leading-relaxed", className)}
      dangerouslySetInnerHTML={{ __html: sanitizeEmailHtmlForDisplay(body) }}
    />
  );
}

export function emailCopyText(subject: string | undefined, body: string): string {
  const plain = emailBodyPlainText(body);
  return [subject?.trim(), plain].filter(Boolean).join("\n\n");
}
