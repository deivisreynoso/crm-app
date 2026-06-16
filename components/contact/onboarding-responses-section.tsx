"use client";

import { useState } from "react";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";

type OnboardingResponse = {
  id: string;
  submitted_at: string;
  business_name?: string | null;
  website_url?: string | null;
  ecommerce_platform?: string | null;
  whatsapp_number?: string | null;
  technical_contact_name?: string | null;
  technical_contact_email?: string | null;
  pain_points?: string[] | null;
  existing_tools?: string | null;
  brand_colors?: string | null;
  escalation_channel?: {
    channels?: string[];
    whatsapp?: string;
    email?: string;
  } | null;
  suggested_integrations?: { name: string; reason_en?: string; reason_es?: string }[] | null;
  additional_notes?: string | null;
  logo_storage_path?: string | null;
};

export function OnboardingResponsesSection({ contactId }: { contactId: string }) {
  const { canManage } = useWorkspaceCapabilities();
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ["onboarding-responses", contactId],
    queryFn: async () => {
      const { data } = await axios.get<{ data: OnboardingResponse[] }>(
        `/api/contacts/${contactId}/onboarding-responses`
      );
      return data.data;
    },
  });

  async function handleDelete(id: string) {
    if (!confirm("Delete this questionnaire response?")) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/onboarding-responses/${id}`);
      await qc.invalidateQueries({ queryKey: ["onboarding-responses", contactId] });
    } finally {
      setDeleting(null);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  if (responses.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No questionnaire responses yet.</p>;
  }

  return (
    <div className="space-y-3">
      {responses.map((r) => (
        <div
          key={r.id}
          className="rounded-lg border border-[var(--border)] p-4 text-sm space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-[var(--muted)]">
              Submitted: {new Date(r.submitted_at).toLocaleString()}
            </p>
            {canManage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deleting === r.id}
                onClick={() => void handleDelete(r.id)}
              >
                Delete
              </Button>
            )}
          </div>
          {r.business_name && <p><strong>Business:</strong> {r.business_name}</p>}
          {r.website_url && <p><strong>Website:</strong> {r.website_url}</p>}
          {r.ecommerce_platform && <p><strong>Platform:</strong> {r.ecommerce_platform}</p>}
          {r.whatsapp_number && <p><strong>WhatsApp:</strong> {r.whatsapp_number}</p>}
          {(r.technical_contact_name || r.technical_contact_email) && (
            <p>
              <strong>Technical contact:</strong>{" "}
              {[r.technical_contact_name, r.technical_contact_email].filter(Boolean).join(" · ")}
            </p>
          )}
          {r.pain_points?.length ? (
            <div className="flex flex-wrap gap-1">
              {r.pain_points.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs"
                >
                  {p}
                </span>
              ))}
            </div>
          ) : null}
          {r.existing_tools && <p><strong>Tools:</strong> {r.existing_tools}</p>}
          {r.brand_colors && (
            <p className="flex items-center gap-2">
              <strong>Brand colors:</strong>
              <span
                className="inline-block h-5 w-5 rounded border"
                style={{ background: r.brand_colors }}
                title={r.brand_colors}
              />
              {r.brand_colors}
            </p>
          )}
          {r.escalation_channel?.channels?.length ? (
            <p>
              <strong>Escalation:</strong>{" "}
              {r.escalation_channel.channels.join(", ")}
              {r.escalation_channel.whatsapp
                ? ` · WA: ${r.escalation_channel.whatsapp}`
                : ""}
              {r.escalation_channel.email
                ? ` · Email: ${r.escalation_channel.email}`
                : ""}
            </p>
          ) : null}
          {r.suggested_integrations?.length ? (
            <ul className="list-disc pl-4 text-xs">
              {r.suggested_integrations.map((s) => (
                <li key={s.name}>{s.name}</li>
              ))}
            </ul>
          ) : null}
          {r.additional_notes && <p className="whitespace-pre-wrap">{r.additional_notes}</p>}
        </div>
      ))}
    </div>
  );
}
