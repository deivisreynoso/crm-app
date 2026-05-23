"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { DocumentFormInput } from "@/types";

interface DocumentUploadFormProps {
  defaultContactId?: string;
  defaultCompanyId?: string;
  defaultOpportunityId?: string;
  onSubmit: (metadata: DocumentFormInput, file?: File | null) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

const inputClass =
  "w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900";

export function DocumentUploadForm({
  defaultContactId,
  defaultCompanyId,
  onSubmit,
  onCancel,
  isLoading,
  errorMessage,
}: DocumentUploadFormProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (!defaultContactId && !defaultCompanyId) return;

    await onSubmit(
      {
        title: title.trim(),
        type: "attachment",
        contact_id: defaultContactId,
        company_id: defaultCompanyId,
        status: "draft",
      },
      file
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
          {errorMessage}
        </p>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Title *
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={inputClass}
          placeholder={file?.name ?? "Document name"}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          File
        </label>
        <input
          type="file"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f && !title) setTitle(f.name);
          }}
          className="w-full text-sm"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </form>
  );
}
