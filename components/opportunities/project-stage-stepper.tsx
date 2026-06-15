"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PROJECT_STAGES,
  nextProjectStage,
  isWonPipelineStage,
  type ProjectStage,
} from "@/lib/project-stages/constants";
import {
  DEFAULT_PROJECT_STAGE_LABELS,
  type ProjectStageLabels,
} from "@/lib/project-stages/defaults";
import type { OpportunityWithContact, PipelineStage } from "@/types";

type Props = {
  opportunity: OpportunityWithContact;
  pipelineStages: PipelineStage[];
  stageLabels?: ProjectStageLabels;
  maintenanceEnabled?: boolean;
  canManage?: boolean;
  locale?: "en" | "es";
  onUpdated?: (opp: OpportunityWithContact) => void;
};

export function ProjectStageStepper({
  opportunity,
  pipelineStages,
  stageLabels = DEFAULT_PROJECT_STAGE_LABELS,
  maintenanceEnabled: maintenanceEnabledProp,
  canManage = false,
  locale = "en",
  onUpdated,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(
    maintenanceEnabledProp ?? true
  );

  useEffect(() => {
    if (maintenanceEnabledProp !== undefined) {
      setMaintenanceEnabled(maintenanceEnabledProp);
      return;
    }
    void axios
      .get<{ project_stages_settings?: { maintenance_enabled?: boolean } }>(
        "/api/settings/automations"
      )
      .then((res) => {
        setMaintenanceEnabled(
          res.data.project_stages_settings?.maintenance_enabled ?? true
        );
      })
      .catch(() => {
        setMaintenanceEnabled(true);
      });
  }, [maintenanceEnabledProp]);

  const isWon = useMemo(() => {
    const stageName = pipelineStages.find((s) => s.id === opportunity.stage)?.name;
    return isWonPipelineStage(opportunity.stage, stageName);
  }, [opportunity.stage, pipelineStages]);

  const currentStage = opportunity.project_stage as ProjectStage | null | undefined;

  const visibleStages = useMemo(
    (): ProjectStage[] =>
      maintenanceEnabled
        ? [...PROJECT_STAGES]
        : PROJECT_STAGES.filter((s) => s !== "maintenance"),
    [maintenanceEnabled]
  );

  if (!isWon || !currentStage) return null;

  const currentIndex = visibleStages.indexOf(currentStage);
  const next = nextProjectStage(currentStage, { maintenanceEnabled });

  async function changeStage(stage: ProjectStage) {
    setSaving(true);
    setError(null);
    try {
      const { data } = await axios.patch<OpportunityWithContact>(
        `/api/opportunities/${opportunity.id}/project-stage`,
        { stage }
      );
      onUpdated?.(data);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string })?.error ?? err.message
        : "Failed to update project stage";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[color-mix(in_srgb,var(--card)_96%,var(--primary)_4%)] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-heading">Project stage</p>
        {canManage && next ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => changeStage(next)}
          >
            Move to next stage
          </Button>
        ) : null}
      </div>

      <ol className="flex flex-wrap gap-1">
        {visibleStages.map((stage, index) => {
          const isActive = stage === currentStage;
          const isPast = currentIndex >= 0 && index < currentIndex;
          const label = stageLabels[stage]?.[locale] ?? stage;
          return (
            <li
              key={stage}
              className={cn(
                "flex items-center gap-1 text-xs",
                index < visibleStages.length - 1 &&
                  "after:content-['›'] after:mx-1 after:text-body-muted"
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 border",
                  isActive && "bg-primary text-white border-primary font-medium",
                  !isActive &&
                    isPast &&
                    "bg-emerald-50 text-emerald-800 border-emerald-200",
                  !isActive &&
                    !isPast &&
                    "bg-white text-body-muted border-[var(--card-border)]"
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {canManage ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-body-muted">Change stage</label>
          <select
            className="input-field text-sm min-w-[160px]"
            value={currentStage}
            disabled={saving}
            onChange={(e) => changeStage(e.target.value as ProjectStage)}
          >
            {visibleStages.map((stage) => (
              <option key={stage} value={stage}>
                {stageLabels[stage]?.[locale] ?? stage}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
