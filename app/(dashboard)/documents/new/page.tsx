"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-shell";
import { useDocumentTemplates } from "@/hooks/useDocumentTemplates";
import axios from "axios";
import type { CrmDocument, DocumentFormInput } from "@/types";
import { formatApiError } from "@/lib/validation-errors";

export default function NewDocumentPage() {
  const router = useRouter();
  const { data: templates = [] } = useDocumentTemplates();
  const [title, setTitle] = useState("New estimate");
  const [type, setType] = useState<DocumentFormInput["type"]>("estimate");
  const [templateId, setTemplateId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const template = templates.find((t) => t.id === templateId);
      const { data } = await axios.post<CrmDocument>(
        "/api/documents",
        {
          title: title.trim(),
          type,
          content: template?.content ?? "",
          status: "draft",
        },
        { headers: { "Content-Type": "application/json" } }
      );
      router.push(`/documents/${data.id}`);
    } catch (err) {
      setError(formatApiError(err, "Could not create document"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader
        title="New document"
        description="Start from scratch or apply a template, then drag variables into the editor"
      />
      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <form onSubmit={handleCreate} className="surface-card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-heading mb-1">Title</label>
          <input
            className="input-field w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-heading mb-1">Type</label>
          <select
            className="input-field w-full"
            value={type}
            onChange={(e) =>
              setType(e.target.value as DocumentFormInput["type"])
            }
          >
            <option value="estimate">Estimate</option>
            <option value="proposal">Proposal</option>
            <option value="contract">Contract</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-heading mb-1">
            Template (optional)
          </label>
          <select
            className="input-field w-full"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">Blank document</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 pt-2">
          <Link href="/documents">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            Create & edit
          </Button>
        </div>
      </form>
    </div>
  );
}
