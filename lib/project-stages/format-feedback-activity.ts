export type ProjectFeedbackNotes = {
  what_worked?: string | null;
  what_to_improve?: string | null;
  would_recommend?: string | null;
};

const RECOMMEND_LABELS = {
  en: { yes: "Yes", maybe: "Maybe", no: "No" },
  es: { yes: "Sí", maybe: "Tal vez", no: "No" },
} as const;

export function formatProjectFeedbackActivityContent(
  score: number,
  notes: ProjectFeedbackNotes,
  locale: "en" | "es" = "en"
): string {
  const L = locale;
  const lines: string[] = [
    L === "en" ? `Overall rating: ${score}/5` : `Calificación general: ${score}/5`,
  ];

  if (notes.what_worked?.trim()) {
    lines.push(
      L === "en"
        ? `What worked well:\n${notes.what_worked.trim()}`
        : `Qué funcionó bien:\n${notes.what_worked.trim()}`
    );
  }

  if (notes.what_to_improve?.trim()) {
    lines.push(
      L === "en"
        ? `What to improve:\n${notes.what_to_improve.trim()}`
        : `Qué mejorar:\n${notes.what_to_improve.trim()}`
    );
  }

  const rec = notes.would_recommend?.trim();
  if (rec && (rec === "yes" || rec === "maybe" || rec === "no")) {
    const label = RECOMMEND_LABELS[L][rec];
    lines.push(
      L === "en" ? `Would recommend: ${label}` : `¿Nos recomendaría?: ${label}`
    );
  }

  return lines.join("\n\n");
}

export function parseProjectFeedbackMetadata(
  metadata: Record<string, unknown> | null
): { score: number; notes: ProjectFeedbackNotes } | null {
  if (!metadata) return null;
  const score = metadata.feedback_score;
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  const raw = metadata.feedback_notes;
  const notes: ProjectFeedbackNotes =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? {
          what_worked:
            typeof (raw as ProjectFeedbackNotes).what_worked === "string"
              ? (raw as ProjectFeedbackNotes).what_worked
              : null,
          what_to_improve:
            typeof (raw as ProjectFeedbackNotes).what_to_improve === "string"
              ? (raw as ProjectFeedbackNotes).what_to_improve
              : null,
          would_recommend:
            typeof (raw as ProjectFeedbackNotes).would_recommend === "string"
              ? (raw as ProjectFeedbackNotes).would_recommend
              : null,
        }
      : {};
  return { score, notes };
}
