/** Distinct palette for per-user calendar event colors (cycles when exhausted). No greys. */
export const CALENDAR_COLOR_PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#eab308",
  "#6366f1",
  "#06b6d4",
  "#f43f5e",
  "#84cc16",
  "#0ea5e9",
  "#a855f7",
] as const;

/** Fallback when owner color is missing — first palette color, never grey. */
export const DEFAULT_CALENDAR_COLOR = CALENDAR_COLOR_PALETTE[0];

/** Common grey hex values — not allowed for appointment owner colors. */
const DISALLOWED_GREY_COLORS = new Set(
  [
    "#6b7280",
    "#9ca3af",
    "#d1d5db",
    "#4b5563",
    "#374151",
    "#64748b",
    "#94a3b8",
    "#71717a",
    "#a1a1aa",
    "#737373",
    "#808080",
    "#999999",
    "#b0b0b0",
    "#cccccc",
  ].map((c) => c.toLowerCase())
);

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isGreyCalendarColor(value: string): boolean {
  const hex = value.trim().toLowerCase();
  if (DISALLOWED_GREY_COLORS.has(hex)) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // Low chroma ≈ grey/neutral
  return max - min < 28 && max > 40 && min < 220;
}

export function isValidCalendarColor(value: string | null | undefined): boolean {
  const normalized = normalizeCalendarColor(value);
  return !!normalized && !isGreyCalendarColor(normalized);
}

export function normalizeCalendarColor(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  return HEX_COLOR.test(v) ? v.toLowerCase() : null;
}

/** Resolve display color for calendar events; never returns grey. */
export function resolveCalendarOwnerColor(value: string | null | undefined): string {
  const normalized = normalizeCalendarColor(value);
  if (normalized && !isGreyCalendarColor(normalized)) return normalized;
  return DEFAULT_CALENDAR_COLOR;
}

export function pickNextCalendarColor(usedColors: string[]): string {
  const used = new Set(
    usedColors.map((c) => c.toLowerCase()).filter((c) => !isGreyCalendarColor(c))
  );
  for (const color of CALENDAR_COLOR_PALETTE) {
    if (!used.has(color)) return color;
  }
  const index = usedColors.length % CALENDAR_COLOR_PALETTE.length;
  return CALENDAR_COLOR_PALETTE[index]!;
}
