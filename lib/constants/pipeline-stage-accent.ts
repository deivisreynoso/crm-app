import type { PipelineStage } from "@/types";

export interface PipelineStageAccent {
  titleClass: string;
  headerBgClass: string;
  barClass: string;
  badgeClass: string;
  gradientTitle?: boolean;
}

/** Brand palette cycling for pipeline columns — distinct, scannable stage headers. */
const STAGE_PALETTE: PipelineStageAccent[] = [
  {
    titleClass: "text-[var(--primary)]",
    headerBgClass:
      "bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))]",
    barClass: "bg-[var(--primary)]",
    badgeClass:
      "bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--primary)]",
  },
  {
    titleClass: "text-[var(--secondary)]",
    headerBgClass:
      "bg-[color-mix(in_srgb,var(--secondary)_12%,var(--card))]",
    barClass: "bg-[var(--secondary)]",
    badgeClass:
      "bg-[color-mix(in_srgb,var(--secondary)_18%,transparent)] text-[color-mix(in_srgb,var(--secondary)_85%,#0f1419)]",
  },
  {
    titleClass: "text-[var(--accent)]",
    headerBgClass:
      "bg-[color-mix(in_srgb,var(--accent)_10%,var(--card))]",
    barClass: "bg-[var(--accent)]",
    badgeClass:
      "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]",
  },
  {
    titleClass: "text-[var(--success)]",
    headerBgClass:
      "bg-[color-mix(in_srgb,var(--success)_10%,var(--card))]",
    barClass: "bg-[var(--success)]",
    badgeClass:
      "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]",
  },
  {
    titleClass: "text-[var(--warning)]",
    headerBgClass:
      "bg-[color-mix(in_srgb,var(--warning)_10%,var(--card))]",
    barClass: "bg-[var(--warning)]",
    badgeClass:
      "bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[color-mix(in_srgb,var(--warning)_80%,#0f1419)]",
  },
];

const KNOWN_STAGE_INDEX: Record<string, number> = {
  new_lead: 0,
  qualified: 1,
  nurturing: 2,
  booked: 3,
  closed_won: 4,
};

const WON_STAGE_ACCENT: PipelineStageAccent = {
  titleClass: "text-brand-gradient",
  headerBgClass:
    "bg-[color-mix(in_srgb,var(--gradient-start)_8%,var(--card))]",
  barClass: "brand-gradient",
  badgeClass:
    "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)]",
  gradientTitle: true,
};

export function getPipelineStageAccent(
  stage: PipelineStage,
  index: number
): PipelineStageAccent {
  if (stage.id === "closed_won") return WON_STAGE_ACCENT;

  const known = KNOWN_STAGE_INDEX[stage.id];
  const paletteIndex =
    known !== undefined ? known : index % STAGE_PALETTE.length;
  return STAGE_PALETTE[paletteIndex]!;
}

export function getPipelineStageAccentById(
  stageId: string,
  stages: PipelineStage[]
): PipelineStageAccent {
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((s) => s.id === stageId);
  const stage = sorted[index];
  if (!stage) return STAGE_PALETTE[0]!;
  return getPipelineStageAccent(stage, index >= 0 ? index : 0);
}
