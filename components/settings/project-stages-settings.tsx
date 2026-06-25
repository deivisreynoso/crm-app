"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PROJECT_STAGES_SETTINGS,
  type ProjectStageLabels,
  type ProjectStagesSettings,
} from "@/lib/project-stages/defaults";
import { DELIVERY_PROJECT_STAGES } from "@/lib/project-stages/constants";

function fetchAutomationsProjectSettings() {
  return axios
    .get<{
      project_stages_settings: ProjectStagesSettings;
      default_project_stages_settings: ProjectStagesSettings;
    }>("/api/settings/automations")
    .then((res) => res.data);
}

export function ProjectStagesSettingsPanel() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<ProjectStagesSettings>(
    DEFAULT_PROJECT_STAGES_SETTINGS
  );
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetchAutomationsProjectSettings()
      .then((data) => {
        setSettings(
          data.project_stages_settings ?? data.default_project_stages_settings
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const save = useMutation({
    mutationFn: () =>
      axios.patch("/api/settings/automations", {
        project_stages_settings: settings,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function updateLabel(stage: keyof ProjectStageLabels, locale: "en" | "es", value: string) {
    setSettings((prev) => ({
      ...prev,
      stage_labels: {
        ...prev.stage_labels,
        [stage]: {
          ...prev.stage_labels[stage],
          [locale]: value,
        },
      },
    }));
  }

  if (loading) {
    return <p className="text-sm text-body-muted">Loading project stage settings…</p>;
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <p className="text-sm text-body-muted">
        Configure delivery stage labels and Google review guardrails. Sync{" "}
        <code>review_score_threshold</code> and <code>google_review_delay_hours</code> with the
        N8N <strong>Project Advocacy</strong> Config node after saving.
      </p>

      <div className="space-y-3">
        <p className="text-sm font-medium text-heading">Stage labels (EN / ES)</p>
        <div className="grid gap-3">
          {DELIVERY_PROJECT_STAGES.map((stage) => (
            <div key={stage} className="grid sm:grid-cols-[120px_1fr_1fr] gap-2 items-center">
              <span className="text-xs font-mono text-body-muted">{stage}</span>
              <input
                className="input-field text-sm"
                value={settings.stage_labels[stage].en}
                onChange={(e) => updateLabel(stage, "en", e.target.value)}
              />
              <input
                className="input-field text-sm"
                value={settings.stage_labels[stage].es}
                onChange={(e) => updateLabel(stage, "es", e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-heading mb-1">
            Review score threshold (1–5)
          </label>
          <input
            type="number"
            min={1}
            max={5}
            className="input-field w-24"
            value={settings.review_score_threshold}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                review_score_threshold: Number(e.target.value) || 4,
              }))
            }
          />
          <p className="text-xs text-body-muted mt-1">
            Google review email only when feedback score meets this threshold.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-heading mb-1">
            Google review delay (hours)
          </label>
          <input
            type="number"
            min={0}
            max={168}
            className="input-field w-24"
            value={settings.google_review_delay_hours}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                google_review_delay_hours: Number(e.target.value) || 24,
              }))
            }
          />
          <p className="text-xs text-body-muted mt-1">
            N8N Wait node should match this value (default 24h).
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.automatic_google_review_enabled}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              automatic_google_review_enabled: e.target.checked,
            }))
          }
        />
        Automatic Google review invitation after positive project feedback
      </label>

      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Saving…" : saved ? "Saved" : "Save project stages"}
      </Button>
    </form>
  );
}
