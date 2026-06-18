"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { LossReasonFields } from "@/components/forms/loss-reason-fields";
import { useLossReasonOptions } from "@/hooks/useLossReasonOptions";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: (payload: { loss_reason: string; loss_reason_notes?: string }) => void;
  onCancel: () => void;
};

export function LossReasonModal({
  open,
  title,
  description,
  confirmLabel,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const { locale } = useCrmLocale();
  const { data: options = [] } = useLossReasonOptions();
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isEs = locale === "es";

  function handleConfirm() {
    if (!reason.trim()) {
      setError(
        isEs ? "Selecciona un motivo de pérdida." : "Select a loss reason."
      );
      return;
    }
    setError(null);
    onConfirm({
      loss_reason: reason.trim(),
      loss_reason_notes: notes.trim() || undefined,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={
        title ??
        (isEs ? "¿Por qué se perdió esta oportunidad?" : "Why was this opportunity lost?")
      }
    >
      <div className="space-y-4">
        {description ? (
          <p className="text-sm text-body-muted">{description}</p>
        ) : (
          <p className="text-sm text-body-muted">
            {isEs
              ? "Registra el motivo para mejorar el pipeline y los reportes."
              : "Capture why the deal was lost for pipeline analytics."}
          </p>
        )}
        <LossReasonFields
          options={options}
          locale={locale}
          reason={reason}
          notes={notes}
          onReasonChange={setReason}
          onNotesChange={setNotes}
          required
        />
        {error && (
          <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            {isEs ? "Cancelar" : "Cancel"}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={handleConfirm}
          >
            {confirmLabel ?? (isEs ? "Guardar y mover" : "Save and move")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
