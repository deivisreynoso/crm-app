"use client";

import { FormLabel } from "@/components/ui/form-label";
import {
  lossReasonLabel,
  type LossReasonOption,
} from "@/lib/constants/loss-reasons";

type Props = {
  options: LossReasonOption[];
  locale?: "en" | "es";
  reason: string;
  notes: string;
  onReasonChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  required?: boolean;
  idPrefix?: string;
};

export function LossReasonFields({
  options,
  locale = "en",
  reason,
  notes,
  onReasonChange,
  onNotesChange,
  required,
  idPrefix = "loss",
}: Props) {
  const selectLabel =
    locale === "es" ? "Motivo de pérdida" : "Reason for loss";
  const notesLabel =
    locale === "es" ? "Notas adicionales (opcional)" : "Additional notes (optional)";
  const placeholder =
    locale === "es" ? "Selecciona un motivo" : "Select a reason";

  return (
    <div className="space-y-3">
      <div>
        <FormLabel htmlFor={`${idPrefix}-reason`} required={required}>
          {selectLabel}
        </FormLabel>
        <select
          id={`${idPrefix}-reason`}
          className="input-field w-full mt-1"
          value={reason}
          required={required}
          onChange={(e) => onReasonChange(e.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {lossReasonLabel([opt], opt.value, locale) || opt.label_en}
            </option>
          ))}
        </select>
      </div>
      <div>
        <FormLabel htmlFor={`${idPrefix}-notes`}>{notesLabel}</FormLabel>
        <textarea
          id={`${idPrefix}-notes`}
          className="input-field w-full mt-1 min-h-[72px]"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={
            locale === "es"
              ? "Contexto que ayude al equipo a mejorar"
              : "Context that helps the team improve"
          }
        />
      </div>
    </div>
  );
}
