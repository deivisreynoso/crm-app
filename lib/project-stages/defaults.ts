import type { ProjectStage } from "@/lib/project-stages/constants";

export type ProjectStageLabels = Record<ProjectStage, { en: string; es: string }>;

export type ProjectStagesSettings = {
  stage_labels: ProjectStageLabels;
  maintenance_enabled: boolean;
  review_score_threshold: number;
  google_review_delay_hours: number;
  automatic_google_review_enabled: boolean;
};

export const DEFAULT_PROJECT_STAGE_LABELS: ProjectStageLabels = {
  onboarding: { en: "Onboarding", es: "Incorporación" },
  design: { en: "Design", es: "Diseño" },
  setup: { en: "Setup", es: "Configuración" },
  launch: { en: "Launch", es: "Lanzamiento" },
  optimization: { en: "Optimization", es: "Optimización" },
  complete: { en: "Complete", es: "Completado" },
  maintenance: { en: "Maintenance", es: "Mantenimiento" },
};

export const DEFAULT_PROJECT_STAGES_SETTINGS: ProjectStagesSettings = {
  stage_labels: DEFAULT_PROJECT_STAGE_LABELS,
  maintenance_enabled: false,
  review_score_threshold: 4,
  google_review_delay_hours: 24,
  automatic_google_review_enabled: true,
};

export function resolveProjectStagesSettings(
  raw: unknown
): ProjectStagesSettings {
  const base = DEFAULT_PROJECT_STAGES_SETTINGS;
  if (!raw || typeof raw !== "object") return base;

  const input = raw as Record<string, unknown>;
  const labels = input.stage_labels;
  const mergedLabels = { ...base.stage_labels };

  if (labels && typeof labels === "object") {
    for (const [key, value] of Object.entries(labels)) {
      if (
        value &&
        typeof value === "object" &&
        "en" in value &&
        "es" in value &&
        key in mergedLabels
      ) {
        const v = value as { en?: string; es?: string };
        mergedLabels[key as keyof ProjectStageLabels] = {
          en: v.en?.trim() || mergedLabels[key as keyof ProjectStageLabels].en,
          es: v.es?.trim() || mergedLabels[key as keyof ProjectStageLabels].es,
        };
      }
    }
  }

  return {
    stage_labels: mergedLabels,
    maintenance_enabled:
      typeof input.maintenance_enabled === "boolean"
        ? input.maintenance_enabled
        : base.maintenance_enabled,
    review_score_threshold:
      typeof input.review_score_threshold === "number" &&
      input.review_score_threshold >= 1 &&
      input.review_score_threshold <= 5
        ? Math.round(input.review_score_threshold)
        : base.review_score_threshold,
    google_review_delay_hours:
      typeof input.google_review_delay_hours === "number" &&
      input.google_review_delay_hours >= 0 &&
      input.google_review_delay_hours <= 168
        ? Math.round(input.google_review_delay_hours)
        : base.google_review_delay_hours,
    automatic_google_review_enabled:
      typeof input.automatic_google_review_enabled === "boolean"
        ? input.automatic_google_review_enabled
        : base.automatic_google_review_enabled,
  };
}
