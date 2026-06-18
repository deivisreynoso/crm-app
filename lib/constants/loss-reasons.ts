export type LossReasonOption = {
  value: string;
  label_en: string;
  label_es: string;
};

/** Default loss reasons — workspace can override in Settings → Automations. */
export const DEFAULT_LOSS_REASON_OPTIONS: LossReasonOption[] = [
  {
    value: "price",
    label_en: "Price / budget constraints",
    label_es: "Precio / restricciones de presupuesto",
  },
  {
    value: "timing",
    label_en: "Bad timing / not ready now",
    label_es: "Mal momento / no están listos",
  },
  {
    value: "competitor",
    label_en: "Chose a competitor",
    label_es: "Eligió un competidor",
  },
  {
    value: "scope",
    label_en: "Scope or fit mismatch",
    label_es: "Alcance o encaje no coincide",
  },
  {
    value: "no_decision",
    label_en: "No decision / went silent",
    label_es: "Sin decisión / dejaron de responder",
  },
  {
    value: "internal",
    label_en: "Internal priorities changed",
    label_es: "Cambiaron prioridades internas",
  },
  {
    value: "diy",
    label_en: "Decided to handle in-house",
    label_es: "Decidieron hacerlo internamente",
  },
  {
    value: "trust",
    label_en: "Trust / credibility concerns",
    label_es: "Preocupaciones de confianza",
  },
  {
    value: "features",
    label_en: "Missing features or integrations",
    label_es: "Faltan funciones o integraciones",
  },
  {
    value: "contract",
    label_en: "Contract or legal terms",
    label_es: "Términos contractuales o legales",
  },
  {
    value: "other",
    label_en: "Other",
    label_es: "Otro",
  },
];

export function normalizeLossReasonOptions(raw: unknown): LossReasonOption[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_LOSS_REASON_OPTIONS;
  }
  const parsed: LossReasonOption[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const value = typeof o.value === "string" ? o.value.trim() : "";
    const label_en =
      typeof o.label_en === "string"
        ? o.label_en.trim()
        : typeof o.label === "string"
          ? o.label.trim()
          : "";
    const label_es =
      typeof o.label_es === "string" ? o.label_es.trim() : label_en;
    if (!value || !label_en) continue;
    parsed.push({ value, label_en, label_es: label_es || label_en });
  }
  return parsed.length ? parsed : DEFAULT_LOSS_REASON_OPTIONS;
}

export function lossReasonLabel(
  options: LossReasonOption[],
  value: string | null | undefined,
  locale: "en" | "es" = "en"
): string {
  const key = value?.trim();
  if (!key) return "";
  const match = options.find((o) => o.value === key);
  if (!match) return key.replace(/_/g, " ");
  return locale === "es" ? match.label_es : match.label_en;
}
