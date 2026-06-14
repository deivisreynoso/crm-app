import { createServerSideClient } from "@/lib/supabase";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import { triggerN8NWebhook } from "@/lib/n8n";
import { findDuplicateContact } from "@/lib/identity/contact-duplicate";
import { getWorkspaceWebsiteLeadsConfig } from "@/lib/team/workspace";
import type { WebsiteCalendarSelection } from "@/lib/leads/booking-calendar-event";
import { upsertBookingCalendarEvent, findContactDiscoveryAppointment } from "@/lib/leads/reschedule-booking";
import { notifyWebsiteLeadAssignee } from "@/lib/leads/website-lead-notify";
import type { CrmLocale } from "@/lib/crm/i18n";

export type WebsiteContactInfo = {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
};

export type WebsiteQualification = {
  platform?: string | null;
  friction_area?: string[] | string | null;
  communication_channels?: string[] | string | null;
  friction_point?: string | null;
  signals?: string | null;
  ai_summary?: string | null;
  recommended_offer?: string | null;
  qualified?: boolean;
  confidence_score?: number | null;
};

export type WebsiteLeadResult = {
  contact_id: string;
  opportunity_id: string | null;
  calendar_event_id: string | null;
  assigned_to: string | null;
  /** True when email already existed — new request was appended */
  returning_visitor: boolean;
};

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const first_name = parts[0] ?? "Lead";
  const last_name = parts.slice(1).join(" ") || "Website";
  return { first_name, last_name };
}

function frictionToString(value: WebsiteQualification["friction_area"]) {
  if (!value) return null;
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function buildNoteContent(
  input: {
    source: "webchat" | "form";
    qualification?: WebsiteQualification;
    conversation_transcript?: string | null;
    language?: string | null;
  },
  returning: boolean
) {
  const q = input.qualification ?? {};
  const prefix = returning
    ? `Return visit — new request (${input.source})`
    : `Lead from website (${input.source})`;
  return (
    input.conversation_transcript?.trim() ||
    [
      prefix,
      q.ai_summary ? `Summary: ${q.ai_summary}` : null,
      q.recommended_offer ? `Recommended: ${q.recommended_offer}` : null,
    ]
      .filter(Boolean)
      .join("\n")
  );
}

async function createOpportunityForContact(
  supabase: ReturnType<typeof createServerSideClient>,
  workspaceOwnerId: string,
  contactId: string,
  companyLabel: string,
  summary: string | null
) {
  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id")
    .eq("user_id", workspaceOwnerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!pipeline?.id) return null;

  const { data: opportunity } = await supabase
    .from("opportunities")
    .insert([
      {
        user_id: workspaceOwnerId,
        contact_id: contactId,
        pipeline_id: pipeline.id,
        stage: "Qualified Lead",
        title: `Discovery Call — ${companyLabel}`,
        notes: summary,
        status: "open",
      },
    ])
    .select("id")
    .single();

  return (opportunity?.id as string) ?? null;
}

async function maybeCreateBookingCalendarEvent(
  supabase: ReturnType<typeof createServerSideClient>,
  workspaceOwnerId: string,
  input: {
    contactId: string;
    opportunityId: string | null;
    contactName: string;
    company?: string | null;
    calendar?: WebsiteCalendarSelection | null;
    reschedule?: boolean;
    assigneeId?: string | null;
    leadEmail?: string | null;
    locale?: CrmLocale;
  }
): Promise<string | null> {
  if (!input.calendar?.date || !input.calendar?.time) return null;

  return upsertBookingCalendarEvent(supabase, workspaceOwnerId, {
    contactId: input.contactId,
    opportunityId: input.opportunityId,
    contactName: input.contactName,
    company: input.company,
    calendar: input.calendar,
    reschedule: input.reschedule,
    assigneeId: input.assigneeId,
    leadEmail: input.leadEmail,
    locale: input.locale,
  });
}

async function appendToExistingContact(
  supabase: ReturnType<typeof createServerSideClient>,
  workspaceOwnerId: string,
  contactId: string,
  input: {
    source: "webchat" | "form";
    contact_info: WebsiteContactInfo;
    qualification?: WebsiteQualification;
    conversation_transcript?: string | null;
    calendar_selection?: WebsiteCalendarSelection | null;
    language?: string | null;
    reschedule?: boolean;
  },
  defaultSalesAssignee: string | null
): Promise<WebsiteLeadResult> {
  const q = input.qualification ?? {};
  const phone = input.contact_info.phone?.trim() || null;
  const email = input.contact_info.email.trim().toLowerCase();
  const company = input.contact_info.company?.trim() || null;
  const { first_name, last_name } = splitName(input.contact_info.name);
  const companyLabel = company ?? `${first_name} ${last_name}`;

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    first_name,
    last_name,
    email,
  };
  if (phone) patch.phone = phone;
  if (company) patch.company = company;
  if (q.platform) patch.platform = q.platform;
  if (q.ai_summary) patch.ai_summary = q.ai_summary;
  const friction = frictionToString(q.friction_area);
  if (friction) patch.friction_area = friction;
  if (q.communication_channels) {
    patch.communication_channels = Array.isArray(q.communication_channels)
      ? q.communication_channels.join(", ")
      : q.communication_channels;
  }
  const signals = q.signals ?? q.friction_point;
  if (signals) patch.signals = signals;
  if (defaultSalesAssignee) patch.assigned_to = defaultSalesAssignee;

  await supabase.from("contacts").update(patch).eq("id", contactId);

  const noteContent = buildNoteContent(input, true);

  let isReschedule = Boolean(input.reschedule);
  if (!isReschedule && input.calendar_selection?.date && input.calendar_selection?.time) {
    const existingAppt = await findContactDiscoveryAppointment(
      supabase,
      workspaceOwnerId,
      contactId
    );
    if (existingAppt?.start_time) {
      isReschedule = new Date(existingAppt.start_time as string) > new Date();
    }
  }

  await supabase.from("notes").insert([
    {
      user_id: workspaceOwnerId,
      entity_type: "contact",
      entity_id: contactId,
      content: noteContent,
      activity_type: "note",
    },
  ]);

  const opportunityId = isReschedule
    ? null
    : await createOpportunityForContact(
        supabase,
        workspaceOwnerId,
        contactId,
        companyLabel,
        q.ai_summary ?? null
      );

  const calendarEventId = await maybeCreateBookingCalendarEvent(
    supabase,
    workspaceOwnerId,
    {
      contactId,
      opportunityId,
      contactName: `${first_name} ${last_name}`.trim(),
      company,
      calendar: input.calendar_selection,
      reschedule: isReschedule,
      assigneeId: defaultSalesAssignee,
      leadEmail: input.contact_info.email,
      locale: input.language === "en" ? "en" : "es",
    }
  );

  await logContactActivity(supabase, {
    userId: workspaceOwnerId,
    contactId,
    type: "update",
    description: isReschedule
      ? `Appointment rescheduled (${input.source})`
      : `Return visit — new ${input.source} request`,
    metadata: { source: input.source, returning_visitor: true },
  });

  if (defaultSalesAssignee) {
    await notifyWebsiteLeadAssignee(supabase, {
      workspaceOwnerId,
      assigneeId: defaultSalesAssignee,
      contactId,
      leadName: `${first_name} ${last_name}`.trim(),
      leadEmail: input.contact_info.email.trim().toLowerCase(),
      source: input.source,
      hasAppointment: Boolean(calendarEventId),
      returningVisitor: true,
    });
  }

  void triggerN8NWebhook("website.lead", {
    contact_id: contactId,
    opportunity_id: opportunityId,
    calendar_event_id: calendarEventId,
    source: input.source,
    assigned_to: defaultSalesAssignee,
    returning_visitor: true,
  });

  return {
    contact_id: contactId,
    opportunity_id: opportunityId,
    calendar_event_id: calendarEventId,
    assigned_to: defaultSalesAssignee,
    returning_visitor: true,
  };
}

export async function createLeadFromWebsite(input: {
  source: "webchat" | "form";
  contact_info: WebsiteContactInfo;
  qualification?: WebsiteQualification;
  calendar_selection?: WebsiteCalendarSelection | null;
  ga_client_id?: string | null;
  conversation_transcript?: string | null;
  language?: string | null;
  reschedule?: boolean;
}): Promise<WebsiteLeadResult> {
  const envOwner = process.env.WEBSITE_LEADS_USER_ID?.trim();
  if (!envOwner) {
    throw new Error(
      "WEBSITE_LEADS_USER_ID is not configured. Set it to the CRM workspace owner user id."
    );
  }

  const { workspaceOwnerId, defaultSalesAssignee } =
    await getWorkspaceWebsiteLeadsConfig(envOwner);

  const supabase = createServerSideClient();
  const { first_name, last_name } = splitName(input.contact_info.name);
  const email = input.contact_info.email.trim().toLowerCase();
  const phone = input.contact_info.phone?.trim() || null;
  const company = input.contact_info.company?.trim() || null;
  const q = input.qualification ?? {};

  const duplicate = await findDuplicateContact(supabase, workspaceOwnerId, {
    email,
    phone,
  });

  if (duplicate) {
    return appendToExistingContact(
      supabase,
      workspaceOwnerId,
      duplicate.contact.id,
      {
        ...input,
        reschedule: input.reschedule ?? false,
      },
      defaultSalesAssignee
    );
  }

  const preferredLanguage =
    input.language === "es" || input.language === "en" ? input.language : null;

  const customFields: Record<string, unknown> = {
    platform: q.platform ?? null,
    friction_area: frictionToString(q.friction_area),
    communication_channels: Array.isArray(q.communication_channels)
      ? q.communication_channels.join(", ")
      : q.communication_channels ?? null,
    signals: q.signals ?? q.friction_point ?? null,
    ai_summary: q.ai_summary ?? null,
    lead_source: input.source,
    ga_client_id: input.ga_client_id ?? null,
  };

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .insert([
      {
        user_id: workspaceOwnerId,
        assigned_to: defaultSalesAssignee,
        first_name,
        last_name,
        email,
        phone,
        company,
        preferred_language: preferredLanguage,
        status: "lead",
        source: input.source,
        platform: q.platform ?? null,
        friction_area: frictionToString(q.friction_area),
        communication_channels: customFields.communication_channels as string,
        signals: (q.signals ?? q.friction_point ?? null) as string | null,
        ai_summary: q.ai_summary ?? null,
        custom_fields: customFields,
      },
    ])
    .select("id")
    .single();

  if (contactError || !contact) {
    throw new Error(contactError?.message ?? "Failed to create contact");
  }

  const contactId = contact.id as string;
  const companyLabel = company ?? `${first_name} ${last_name}`;
  const noteContent = buildNoteContent(input, false);

  await supabase.from("notes").insert([
    {
      user_id: workspaceOwnerId,
      entity_type: "contact",
      entity_id: contactId,
      content: noteContent,
      activity_type: "note",
    },
  ]);

  const opportunityId = await createOpportunityForContact(
    supabase,
    workspaceOwnerId,
    contactId,
    companyLabel,
    q.ai_summary ?? null
  );

  const calendarEventId = await maybeCreateBookingCalendarEvent(
    supabase,
    workspaceOwnerId,
    {
      contactId,
      opportunityId,
      contactName: `${first_name} ${last_name}`.trim(),
      company,
      calendar: input.calendar_selection,
      assigneeId: defaultSalesAssignee,
      leadEmail: email,
      locale: preferredLanguage ?? "es",
    }
  );

  await logContactActivity(supabase, {
    userId: workspaceOwnerId,
    contactId,
    type: "created",
    description: `Lead captured from website (${input.source})`,
    metadata: {
      source: input.source,
      qualified: q.qualified ?? null,
      assigned_to: defaultSalesAssignee,
    },
  });

  if (defaultSalesAssignee) {
    await notifyWebsiteLeadAssignee(supabase, {
      workspaceOwnerId,
      assigneeId: defaultSalesAssignee,
      contactId,
      leadName: `${first_name} ${last_name}`.trim(),
      leadEmail: email,
      source: input.source,
      hasAppointment: Boolean(calendarEventId),
      returningVisitor: false,
    });
  }

  void triggerN8NWebhook("website.lead", {
    contact_id: contactId,
    opportunity_id: opportunityId,
    calendar_event_id: calendarEventId,
    source: input.source,
    assigned_to: defaultSalesAssignee,
  });

  return {
    contact_id: contactId,
    opportunity_id: opportunityId,
    calendar_event_id: calendarEventId,
    assigned_to: defaultSalesAssignee,
    returning_visitor: false,
  };
}
