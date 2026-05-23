"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !loading && onCancel()}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="relative bg-[var(--card)] border border-[var(--card-border)] rounded-xl shadow-[var(--shadow-md)] w-full max-w-md p-6"
      >
        <h2 id="confirm-title" className="text-lg font-semibold text-heading">
          {title}
        </h2>
        <p id="confirm-desc" className="text-sm text-body-muted mt-2 leading-relaxed">
          {description}
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "default" : "default"}
            className={
              destructive
                ? "bg-[var(--error)] text-white hover:opacity-90 border-transparent"
                : undefined
            }
            disabled={loading}
            onClick={() => void onConfirm()}
          >
            {loading ? "Please wait…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
