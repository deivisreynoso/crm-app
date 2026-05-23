export const ACTIVITY_TYPES = ["call", "email", "meeting", "note"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
};

export const ACTIVITY_TYPE_STYLES: Record<ActivityType, string> = {
  call: "bg-blue-50 text-blue-700",
  email: "bg-violet-50 text-violet-700",
  meeting: "bg-amber-50 text-amber-700",
  note: "bg-slate-100 text-slate-700",
};

export const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "French",
  "Portuguese",
  "German",
  "Italian",
  "Chinese",
  "Japanese",
  "Other",
] as const;
