import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import { createNotification } from "@/lib/notifications/create-notification";
import {
  isProjectStage,
  type ProjectStage,
} from "@/lib/project-stages/constants";
import {
  resolveProjectStagesSettings,
  type ProjectStagesSettings,
} from "@/lib/project-stages/defaults";
import { buildProjectWebhookContact } from "@/lib/project-stages/webhook-contact";
import { fireWebhook } from "@/lib/webhooks/outbound";

function generateFeedbackToken(): string {
  return randomBytes(24).toString("hex");
}

export type UpdateProjectStageResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; error: string };

export async function updateOpportunityProjectStage(
  supabase: SupabaseClient,
  input: {
    workspaceOwnerId: string;
    actorUserId: string;
    opportunityId: string;
    stage: ProjectStage;
    settings?: ProjectStagesSettings;
  }
): Promise<UpdateProjectStageResult> {
  const { workspaceOwnerId, actorUserId, opportunityId, stage } = input;

  const { data: existing, error: fetchError } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", opportunityId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, status: 500, error: fetchError.message };
  }
  if (!existing) {
    return { ok: false, status: 404, error: "Opportunity not found" };
  }
  if (!existing.project_stage) {
    return {
      ok: false,
      status: 422,
      error: "Project stage is not available until the opportunity is Won",
    };
  }

  if (stage === "maintenance") {
    return {
      ok: false,
      status: 400,
      error: "Maintenance is not part of the delivery workflow",
    };
  }

  let settings = input.settings;
  if (!settings) {
    const { data: userSettings } = await supabase
      .from("user_settings")
      .select("project_stages_settings")
      .eq("user_id", workspaceOwnerId)
      .maybeSingle();
    settings = resolveProjectStagesSettings(userSettings?.project_stages_settings);
  }

  if (!isProjectStage(stage)) {
    return { ok: false, status: 400, error: "Invalid project stage" };
  }

  const now = new Date().toISOString();
  const previousStage = existing.project_stage as string;
  const updates: Record<string, unknown> = {
    project_stage: stage,
    project_stage_updated_at: now,
    updated_at: now,
  };

  const isCompleting =
    stage === "complete" && previousStage !== "complete" && !existing.project_completed_at;

  if (isCompleting) {
    updates.project_completed_at = now;
    if (!existing.project_feedback_token) {
      updates.project_feedback_token = generateFeedbackToken();
    }
  }

  const { data, error: updateError } = await supabase
    .from("opportunities")
    .update(updates)
    .eq("id", opportunityId)
    .eq("user_id", workspaceOwnerId)
    .select("*")
    .single();

  if (updateError) {
    return { ok: false, status: 500, error: updateError.message };
  }

  const label =
    settings.stage_labels[stage]?.en ?? stage.replace(/_/g, " ");

  await logContactActivity(supabase, {
    userId: workspaceOwnerId,
    createdBy: actorUserId,
    contactId: existing.contact_id as string,
    type: "system",
    description: `Project stage changed to ${label}`,
    metadata: {
      opportunity_id: opportunityId,
      previous_project_stage: previousStage,
      project_stage: stage,
    },
  });

  await createNotification(supabase, workspaceOwnerId, {
    kind: "opportunity_reminder",
    title: "Project stage updated",
    message: `${existing.title}: ${label}`,
    related_entity_type: "opportunity",
    related_entity_id: opportunityId,
  });

  const contact = await buildProjectWebhookContact(
    supabase,
    workspaceOwnerId,
    existing.contact_id as string,
    data as {
      project_feedback_token?: string | null;
      feedback_score?: number | null;
      feedback_notes?: Record<string, unknown> | null;
    }
  );

  const webhookPayload = {
    opportunity_id: opportunityId,
    opportunity: data,
    contact,
    previous_project_stage: previousStage,
    project_stage: stage,
    project_stages_settings: settings,
  };

  void fireWebhook(supabase, workspaceOwnerId, "project.stage_changed", webhookPayload);

  if (isCompleting) {
    void fireWebhook(supabase, workspaceOwnerId, "project.completed", webhookPayload);
  }

  return { ok: true, data: data as Record<string, unknown> };
}
