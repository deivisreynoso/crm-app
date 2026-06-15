"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DELIVERY_PROJECT_STAGES,
  nextProjectStage,
  isWonPipelineStage,
  isDeliveryProjectStage,
  type ProjectStage,
} from "@/lib/project-stages/constants";
import {
  DEFAULT_PROJECT_STAGE_LABELS,
  type ProjectStageLabels,
} from "@/lib/project-stages/defaults";
import { STAGE_VISUALS } from "@/lib/project-stages/stage-visuals";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import type { OpportunityWithContact, PipelineStage } from "@/types";

type Props = {
  opportunity: OpportunityWithContact;
  pipelineStages: PipelineStage[];
  stageLabels?: ProjectStageLabels;
  canManage?: boolean;
  locale?: "en" | "es";
  onUpdated?: (opp: OpportunityWithContact) => void;
};

const COPY = {
  en: { title: "Project", next: "Next", advance: "Advance stage" },
  es: { title: "Proyecto", next: "Siguiente", advance: "Avanzar etapa" },
};

export function ProjectStageStepper({
  opportunity,
  pipelineStages,
  stageLabels = DEFAULT_PROJECT_STAGE_LABELS,
  canManage = false,
  locale: localeProp,
  onUpdated,
}: Props) {
  const { locale: crmLocale } = useCrmLocale();
  const locale = localeProp ?? crmLocale;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = COPY[locale];

  const isWon = useMemo(() => {
    const stageName = pipelineStages.find((s) => s.id === opportunity.stage)?.name;
    return isWonPipelineStage(opportunity.stage, stageName);
  }, [opportunity.stage, pipelineStages]);

  const rawStage = opportunity.project_stage as ProjectStage | null | undefined;
  const currentStage = useMemo((): ProjectStage | null => {
    if (!rawStage) return null;
    if (isDeliveryProjectStage(rawStage)) return rawStage;
    if (rawStage === "maintenance") return "complete";
    return null;
  }, [rawStage]);

  const stages = DELIVERY_PROJECT_STAGES as readonly ProjectStage[];
  const currentIndex = currentStage ? stages.indexOf(currentStage) : -1;
  const next = currentStage ? nextProjectStage(currentStage) : null;

  if (!isWon || !currentStage || currentIndex < 0) return null;

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

  const currentLabel =
    stageLabels[currentStage]?.[locale] ?? currentStage.replace(/_/g, " ");
  const nextLabel = next
    ? stageLabels[next]?.[locale] ?? next.replace(/_/g, " ")
    : null;

  return (
    <div className="rounded-md border border-[var(--card-border)]/60 bg-[var(--card)]/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-body-muted shrink-0">
            {t.title}
          </span>
          <span
            className={cn(
              "text-sm font-medium truncate",
              STAGE_VISUALS[currentStage].text
            )}
          >
            {currentLabel}
          </span>
        </div>
        {canManage && next ? (
          <button
            type="button"
            disabled={saving}
            title={t.advance}
            onClick={() => changeStage(next)}
            className={cn(
              "inline-flex items-center gap-0.5 shrink-0 text-xs font-medium rounded-md px-2 py-1",
              "text-[var(--primary)] hover:bg-[var(--sidebar-hover)] transition-colors",
              "disabled:opacity-50"
            )}
          >
            {t.next}: {nextLabel}
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        ) : null}
      </div>

      <div className="flex items-center w-full" role="list" aria-label={t.title}>
        {stages.map((stage, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const label = stageLabels[stage]?.[locale] ?? stage;
          const visuals = STAGE_VISUALS[stage];

          return (
            <div
              key={stage}
              className={cn("flex items-center", index < stages.length - 1 && "flex-1")}
              role="listitem"
            >
              <button
                type="button"
                disabled={!canManage || saving}
                title={label}
                onClick={() => canManage && changeStage(stage)}
                className={cn(
                  "relative flex items-center justify-center rounded-full transition-all shrink-0",
                  "w-5 h-5 sm:w-6 sm:h-6",
                  canManage && !saving && "cursor-pointer hover:scale-110",
                  !canManage && "cursor-default",
                  isPast && cn(visuals.dot, "text-white"),
                  isCurrent && cn(visuals.dot, "ring-2 ring-offset-1 ring-offset-[var(--card)]", visuals.ring),
                  isFuture && "bg-slate-100 border-2 border-slate-200"
                )}
              >
                {isPast ? (
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                ) : isCurrent ? (
                  <span className="w-2 h-2 rounded-full bg-white" />
                ) : null}
              </button>
              {index < stages.length - 1 ? (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1 rounded-full min-w-[8px] transition-colors",
                    isPast ? visuals.track : "bg-slate-200"
                  )}
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="hidden sm:flex justify-between mt-1.5 px-0.5">
        {stages.map((stage) => (
          <span
            key={stage}
            className={cn(
              "text-[9px] leading-none text-center flex-1 first:text-left last:text-right",
              stage === currentStage
                ? cn("font-medium", STAGE_VISUALS[stage].text)
                : "text-body-muted/70"
            )}
          >
            {(stageLabels[stage]?.[locale] ?? stage).split(" ")[0]}
          </span>
        ))}
      </div>

      {error ? <p className="text-[11px] text-red-600 mt-1.5">{error}</p> : null}
    </div>
  );
}
