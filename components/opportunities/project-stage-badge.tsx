"use client";

import { cn } from "@/lib/utils";
import {
  PROJECT_STAGES,
  type ProjectStage,
} from "@/lib/project-stages/constants";
import type { ProjectStageLabels } from "@/lib/project-stages/defaults";
import { STAGE_VISUALS } from "@/lib/project-stages/stage-visuals";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";

type Props = {
  stage: string;
  labels?: ProjectStageLabels;
  locale?: "en" | "es";
  className?: string;
};

export function ProjectStageBadge({
  stage,
  labels,
  locale: localeProp,
  className,
}: Props) {
  const { locale: crmLocale } = useCrmLocale();
  const locale = localeProp ?? crmLocale;

  if (!stage || !(PROJECT_STAGES as readonly string[]).includes(stage)) {
    return null;
  }

  const key = stage as ProjectStage;
  const label = labels?.[key]?.[locale] ?? key.replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize",
        STAGE_VISUALS[key].badge,
        className
      )}
    >
      {label}
    </span>
  );
}
