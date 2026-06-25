"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { GOOGLE_REVIEWS_URL } from "@/lib/website/google-reviews-url";
import { formatApiError } from "@/lib/validation-errors";

export function GoogleReviewRequestSettings() {
  const { dict, locale } = useCrmLocale();
  const s = dict.settings;
  const { data: settings, isLoading, refetch } = useWorkspaceSettings();
  const { data: templates = [] } = useEmailTemplates();

  const [reviewUrl, setReviewUrl] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReviewUrl(settings.google_reviews_url?.trim() || GOOGLE_REVIEWS_URL);
    setTemplateId(settings.review_request_template_id ?? "");
  }, [settings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await axios.patch("/api/settings/member", {
        google_reviews_url: reviewUrl.trim(),
        review_request_template_id: templateId || null,
      });
      await refetch();
      setMessage("Saved.");
    } catch (err) {
      setError(formatApiError(err, "Could not save"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSeedTemplate() {
    setError(null);
    setMessage(null);
    try {
      const { data } = await axios.post<{ template_id: string }>(
        "/api/settings/review-request/seed",
        { locale }
      );
      setTemplateId(data.template_id);
      setMessage("Default template created.");
    } catch (err) {
      setError(formatApiError(err, "Could not create template"));
    }
  }

  if (isLoading) {
    return <p className="text-sm text-body-muted">Loading…</p>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <p className="text-sm text-body-muted">{s?.reviewRequestsHelp}</p>

      <div>
        <label className="text-xs font-medium text-heading block mb-1">
          {s?.googleReviewsUrl}
        </label>
        <input
          type="url"
          className="input-field w-full"
          value={reviewUrl}
          onChange={(e) => setReviewUrl(e.target.value)}
          placeholder="https://..."
          required
        />
        <p className="text-xs text-body-muted mt-1">{s?.googleReviewsUrlHelp}</p>
      </div>

      <div>
        <label className="text-xs font-medium text-heading block mb-1">
          {s?.reviewTemplate}
        </label>
        <select
          className="input-field w-full"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
        >
          <option value="">{s?.noReviewTemplate}</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-body-muted mt-1">{s?.reviewTemplateHelp}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => void handleSeedTemplate()}
        >
          {s?.createReviewTemplate}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      <Button type="submit" size="sm" disabled={saving}>
        {s?.saveReviewSettings ?? "Save"}
      </Button>
    </form>
  );
}
