import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emailSalesGroup,
  notifySalesGroupInApp,
  salesWebsiteLeadGroupEmail,
} from "@/lib/notifications/workspace-groups";

export async function notifySalesGroupWebsiteLead(
  supabase: SupabaseClient,
  input: {
    workspaceOwnerId: string;
    contactId: string;
    leadName: string;
    leadEmail: string;
    source: "form" | "webchat";
    hasAppointment: boolean;
    returningVisitor: boolean;
  }
): Promise<void> {
  const title = input.returningVisitor
    ? "Returning website lead"
    : "New website lead";

  await notifySalesGroupInApp(supabase, input.workspaceOwnerId, {
    kind: "sales_website_lead",
    title,
    message: input.leadName,
    related_entity_type: "contact",
    related_entity_id: input.contactId,
  });

  const mail = salesWebsiteLeadGroupEmail(input);
  await emailSalesGroup(
    supabase,
    input.workspaceOwnerId,
    mail.subject,
    mail.html,
    mail.text
  );
}
