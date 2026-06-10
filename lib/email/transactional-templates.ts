/** Branded HTML for system emails (Mailgun). */

function layout(body: string): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:32rem;margin:0 auto;padding:1.5rem">
  <p style="font-weight:600;font-size:1.125rem;margin:0 0 1rem">ClickIn 360 CRM</p>
  ${body}
  <p style="margin-top:2rem;font-size:0.75rem;color:#666">If you did not request this, you can ignore this email.</p>
</body>
</html>`;
}

export function passwordResetEmailHtml(resetLink: string): string {
  return layout(`
  <p>You requested a password reset.</p>
  <p><a href="${resetLink}" style="display:inline-block;background:#1e3a5f;color:#fff;padding:0.625rem 1.25rem;border-radius:0.375rem;text-decoration:none;font-weight:500">Choose a new password</a></p>
  <p style="font-size:0.875rem;color:#444">This link expires in about an hour. Open it on any device.</p>
  <p style="font-size:0.75rem;color:#666;word-break:break-all">${resetLink}</p>
`);
}

export function teamInviteEmailHtml(inviteUrl: string): string {
  return layout(`
  <p>You have been invited to ClickIn 360 CRM.</p>
  <p><a href="${inviteUrl}" style="display:inline-block;background:#1e3a5f;color:#fff;padding:0.625rem 1.25rem;border-radius:0.375rem;text-decoration:none;font-weight:500">Create your account</a></p>
  <p style="font-size:0.875rem;color:#444">This invitation link expires in 7 days.</p>
`);
}
