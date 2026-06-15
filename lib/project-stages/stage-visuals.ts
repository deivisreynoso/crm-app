import type { ProjectStage } from "@/lib/project-stages/constants";

/** Per-stage colors for badges, stepper dots, and progress segments */
export const STAGE_VISUALS: Record<
  ProjectStage,
  { dot: string; track: string; ring: string; text: string; badge: string }
> = {
  onboarding: {
    dot: "bg-sky-500",
    track: "bg-sky-500",
    ring: "ring-sky-300",
    text: "text-sky-700",
    badge: "bg-sky-50 text-sky-800 border-sky-200",
  },
  design: {
    dot: "bg-violet-500",
    track: "bg-violet-500",
    ring: "ring-violet-300",
    text: "text-violet-700",
    badge: "bg-violet-50 text-violet-800 border-violet-200",
  },
  setup: {
    dot: "bg-amber-500",
    track: "bg-amber-500",
    ring: "ring-amber-300",
    text: "text-amber-800",
    badge: "bg-amber-50 text-amber-900 border-amber-200",
  },
  launch: {
    dot: "bg-emerald-500",
    track: "bg-emerald-500",
    ring: "ring-emerald-300",
    text: "text-emerald-700",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  optimization: {
    dot: "bg-orange-500",
    track: "bg-orange-500",
    ring: "ring-orange-300",
    text: "text-orange-800",
    badge: "bg-orange-50 text-orange-900 border-orange-200",
  },
  complete: {
    dot: "bg-green-600",
    track: "bg-green-600",
    ring: "ring-green-300",
    text: "text-green-800",
    badge: "bg-green-50 text-green-900 border-green-200",
  },
  maintenance: {
    dot: "bg-slate-400",
    track: "bg-slate-400",
    ring: "ring-slate-300",
    text: "text-slate-600",
    badge: "bg-slate-50 text-slate-700 border-slate-200",
  },
};
