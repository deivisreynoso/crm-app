"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  subject: string;
  bodyHtml: string;
  to: string;
};

export function EmailPreviewModal({ open, onClose, subject, bodyHtml, to }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Email preview" size="lg">
      <div className="space-y-3 text-sm">
        <p>
          <span className="text-body-muted">To:</span> {to || "—"}
        </p>
        <p>
          <span className="text-body-muted">Subject:</span> {subject || "—"}
        </p>
        <div
          className="border border-[var(--card-border)] rounded-lg p-4 bg-white text-slate-900 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>
      <div className="flex justify-end pt-4">
        <Button type="button" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
