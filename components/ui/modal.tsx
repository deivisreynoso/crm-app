"use client";

import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="modal-title"
        className="relative bg-[var(--card)] border border-[var(--card-border)] rounded-xl shadow-[var(--shadow-md)] w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--card-border)] px-6 py-4 flex items-center justify-between">
          <h2 id="modal-title" className="text-lg font-semibold text-heading">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-body-muted hover:text-heading text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--sidebar-hover)]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
