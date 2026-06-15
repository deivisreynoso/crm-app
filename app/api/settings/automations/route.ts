import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { recordAuditLog } from "@/lib/audit/record";
import { createServerSideClient } from "@/lib/supabase";
import { z } from "zod";
import { formatValidationDetails } from "@/lib/validation-errors";
import {
  DEFAULT_APPOINTMENT_REMINDER_SETTINGS,
  DEFAULT_ONBOARDING_TASK_TEMPLATE,
  resolveAppointmentReminderSettings,
  resolveOnboardingTaskTemplate,
} from "@/lib/onboarding/defaults";
import {
  DEFAULT_PROJECT_STAGES_SETTINGS,
  resolveProjectStagesSettings,
} from "@/lib/project-stages/defaults";
import { OUTBOUND_WEBHOOK_EVENTS } from "@/lib/webhooks/events";

const automationsPatchSchema = z.object({
  outbound_webhook_url: z.string().url().max(2000).optional().or(z.literal("")),
  outbound_webhook_secret: z.string().max(500).optional().or(z.literal("")),
  outbound_webhook_events: z.array(z.string()).optional(),
  onboarding_enabled: z.boolean().optional(),
  onboarding_task_template: z.array(z.record(z.string(), z.unknown())).optional(),
  appointment_reminder_settings: z
    .object({
      enabled: z.boolean().optional(),
      reminders_hours_before: z.array(z.number().int().min(1).max(168)).optional(),
      email_enabled: z.boolean().optional(),
      whatsapp_enabled: z.boolean().optional(),
    })
    .optional(),
  quote_default_expiry_days: z.number().int().min(1).max(365).optional(),
  loss_reason_options: z.array(z.record(z.string(), z.unknown())).optional(),
  session_timeout_hours: z.number().int().min(1).max(168).nullable().optional(),
  project_stages_settings: z
    .object({
      stage_labels: z.record(
        z.string(),
        z.object({ en: z.string().max(120), es: z.string().max(120) })
      ).optional(),
      maintenance_enabled: z.boolean().optional(),
      review_score_threshold: z.number().int().min(1).max(5).optional(),
      google_review_delay_hours: z.number().int().min(0).max(168).optional(),
      automatic_google_review_enabled: z.boolean().optional(),
    })
    .optional(),
});

const AUTOMATIONS_SELECT =
  "outbound_webhook_url, outbound_webhook_secret, outbound_webhook_events, onboarding_enabled, onboarding_task_template, appointment_reminder_settings, quote_default_expiry_days, loss_reason_options, session_timeout_hours, project_stages_settings, updated_at";

export async function GET() {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("user_settings")
      .select(AUTOMATIONS_SELECT)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      outbound_webhook_url: data?.outbound_webhook_url ?? "",
      outbound_webhook_secret: data?.outbound_webhook_secret ? "••••••••" : "",
      outbound_webhook_events: Array.isArray(data?.outbound_webhook_events)
        ? data.outbound_webhook_events
        : [],
      available_webhook_events: OUTBOUND_WEBHOOK_EVENTS,
      onboarding_enabled: data?.onboarding_enabled ?? true,
      onboarding_task_template: resolveOnboardingTaskTemplate(
        data?.onboarding_task_template
      ),
      default_onboarding_task_template: DEFAULT_ONBOARDING_TASK_TEMPLATE,
      appointment_reminder_settings: resolveAppointmentReminderSettings(
        data?.appointment_reminder_settings
      ),
      default_appointment_reminder_settings: DEFAULT_APPOINTMENT_REMINDER_SETTINGS,
      quote_default_expiry_days: data?.quote_default_expiry_days ?? 30,
      loss_reason_options: data?.loss_reason_options ?? [],
      session_timeout_hours: data?.session_timeout_hours ?? null,
      project_stages_settings: resolveProjectStagesSettings(
        data?.project_stages_settings
      ),
      default_project_stages_settings: DEFAULT_PROJECT_STAGES_SETTINGS,
    });
  } catch (err) {
    console.error("GET /api/settings/automations:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } =
      await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const parsed = automationsPatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationDetails(parsed.error.flatten()) || "Invalid request" },
        { status: 400 }
      );
    }

    const patch: Record<string, unknown> = {
      user_id: workspaceOwnerId!,
      updated_at: new Date().toISOString(),
    };

    const body = parsed.data;
    const supabase = createServerSideClient();

    if (body.outbound_webhook_url !== undefined) {
      patch.outbound_webhook_url = body.outbound_webhook_url.trim() || null;
    }
    if (
      body.outbound_webhook_secret !== undefined &&
      body.outbound_webhook_secret !== "••••••••"
    ) {
      patch.outbound_webhook_secret = body.outbound_webhook_secret.trim() || null;
    }
    if (body.outbound_webhook_events !== undefined) {
      patch.outbound_webhook_events = body.outbound_webhook_events;
    }
    if (body.onboarding_enabled !== undefined) {
      patch.onboarding_enabled = body.onboarding_enabled;
    }
    if (body.onboarding_task_template !== undefined) {
      patch.onboarding_task_template = body.onboarding_task_template;
    }
    if (body.appointment_reminder_settings !== undefined) {
      patch.appointment_reminder_settings = body.appointment_reminder_settings;
    }
    if (body.quote_default_expiry_days !== undefined) {
      patch.quote_default_expiry_days = body.quote_default_expiry_days;
    }
    if (body.loss_reason_options !== undefined) {
      patch.loss_reason_options = body.loss_reason_options;
    }
    if (body.session_timeout_hours !== undefined) {
      patch.session_timeout_hours = body.session_timeout_hours;
    }
    if (body.project_stages_settings !== undefined) {
      const { data: existing } = await supabase
        .from("user_settings")
        .select("project_stages_settings")
        .eq("user_id", workspaceOwnerId!)
        .maybeSingle();

      patch.project_stages_settings = resolveProjectStagesSettings({
        ...resolveProjectStagesSettings(existing?.project_stages_settings),
        ...body.project_stages_settings,
      });
    }

    const { data, error: dbError } = await supabase
      .from("user_settings")
      .upsert(patch, { onConflict: "user_id" })
      .select(AUTOMATIONS_SELECT)
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    await recordAuditLog({
      workspaceOwnerId: workspaceOwnerId!,
      actorUserId: userId!,
      action: "settings.automations_updated",
      entityType: "workspace",
      entityId: workspaceOwnerId!,
      entityName: "Automation settings",
      newValues: parsed.data as Record<string, unknown>,
      changeSummary: "Automation settings updated",
      req,
    });

    return NextResponse.json({
      ...data,
      outbound_webhook_secret: data?.outbound_webhook_secret ? "••••••••" : "",
      onboarding_task_template: resolveOnboardingTaskTemplate(
        data?.onboarding_task_template
      ),
      appointment_reminder_settings: resolveAppointmentReminderSettings(
        data?.appointment_reminder_settings
      ),
      project_stages_settings: resolveProjectStagesSettings(
        data?.project_stages_settings
      ),
    });
  } catch (err) {
    console.error("PATCH /api/settings/automations:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
