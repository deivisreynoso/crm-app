import type { SupabaseClient } from "@supabase/supabase-js";
import { getSiteBaseUrl } from "@/lib/website/site-url";
import { getWorkspaceGroupEmails } from "@/lib/notifications/workspace-groups";
import { sendEmail } from "@/lib/email/send";
import { isTransactionalEmailConfigured } from "@/lib/email/send";
import type { SuggestedIntegration, EscalationChannel } from "@/lib/onboarding/store-response";

function formatEscalation(channel: EscalationChannel | null | undefined): string {
  if (!channel?.channels?.length) return "—";
  const parts: string[] = [];
  if (channel.channels.includes("whatsapp") && channel.whatsapp) {
    parts.push(`WhatsApp: ${channel.whatsapp}`);
  }
  if (channel.channels.includes("email") && channel.email) {
    parts.push(`Email: ${channel.email}`);
  }
  return parts.join("; ") || channel.channels.join(", ");
}

function formatStack(stack: SuggestedIntegration[] | null | undefined): string {
  if (!stack?.length) return "—";
  return stack.map((s) => `• ${s.name}`).join("\n");
}

export async function emailOnboardingCompletedToSales(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  input: {
    contactName: string;
    contactEmail?: string | null;
    contactId: string;
    businessName?: string | null;
    platform?: string | null;
    painPoints?: string[] | null;
    escalationChannel?: EscalationChannel | null;
    suggestedStack?: SuggestedIntegration[] | null;
    additionalNotes?: string | null;
  }
): Promise<void> {
  if (!isTransactionalEmailConfigured()) return;

  const { sales } = await getWorkspaceGroupEmails(supabase, workspaceOwnerId);
  const base = getSiteBaseUrl();
  const contactUrl = `${base}/contacts/${input.contactId}?tab=onboarding`;

  const painPoints = input.painPoints?.length ? input.painPoints.join(", ") : "—";

  const subject = `Cuestionario de incorporación completado — ${input.contactName}`;
  const text = [
    `Contacto: ${input.contactName}`,
    input.contactEmail ? `Email: ${input.contactEmail}` : null,
    input.businessName ? `Empresa: ${input.businessName}` : null,
    input.platform ? `Plataforma eCommerce: ${input.platform}` : null,
    `Pain points: ${painPoints}`,
    `Canal de escalamiento: ${formatEscalation(input.escalationChannel)}`,
    `Stack sugerido:\n${formatStack(input.suggestedStack)}`,
    input.additionalNotes ? `Notas: ${input.additionalNotes}` : null,
    "",
    `Ver en CRM: ${contactUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = text.replace(/\n/g, "<br/>");

  try {
    await sendEmail({ to: sales, subject, html, text });
  } catch (err) {
    console.error("emailOnboardingCompletedToSales:", err);
  }
}
