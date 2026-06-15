"use client";

import { cn } from "@/lib/utils";
import {
  PROJECT_STAGES,
  type ProjectStage,
} from "@/lib/project-stages/constants";
import type { ProjectStageLabels } from "@/lib/project-stages/defaults";

const STAGE_COLORS: Record<ProjectStage, string> = {
  onboarding: "bg-sky-100 text-sky-800 border-sky-200",
  design: "bg-violet-100 text-violet-800 border-violet-200",
  setup: "bg-amber-100 text-amber-900 border-amber-200",
  launch: "bg-emerald-100 text-emerald-800 border-emerald-200",
  optimization: "bg-orange-100 text-orange-900 border-orange-200",
  complete: "bg-green-100 text-green-900 border-green-200",
  maintenance: "bg-slate-100 text-slate-800 border-slate-200",
};

type Props = {
  stage: string;
  labels?: ProjectStageLabels;
  locale?: "en" | "es";
  className?: string;
};

export function ProjectStageBadge({
  stage,
  labels,
  locale = "en",
  className,
}: Props) {
  if (!stage || !(PROJECT_STAGES as readonly string[]).includes(stage)) {
    return null;
  }

  const key = stage as ProjectStage;
  const label = labels?.[key]?.[locale] ?? key.replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize",
        STAGE_COLORS[key],
        className
      )}
    >
      {label}
    </span>
  );
}
