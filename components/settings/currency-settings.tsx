"use client";

import { useState } from "react";
import {
  CURRENCY_LABELS,
  WORKSPACE_CURRENCIES,
  type WorkspaceCurrency,
} from "@/lib/constants/currencies";
import {
  useUpdateWorkspaceSettings,
  useWorkspaceSettings,
} from "@/hooks/useWorkspaceSettings";
import { formatApiError } from "@/lib/validation-errors";

export function CurrencySettings() {
  const { data: settings, isLoading } = useWorkspaceSettings();
  const update = useUpdateWorkspaceSettings();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const currency = settings?.default_currency ?? "USD";

  async function handleChange(value: WorkspaceCurrency) {
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({ default_currency: value });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(formatApiError(err, "Could not save currency"));
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-body-muted">
        Default currency for new opportunities and monetary custom fields.
      </p>
      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="input-field max-w-xs"
          value={currency}
          disabled={isLoading || update.isPending}
          onChange={(e) => void handleChange(e.target.value as WorkspaceCurrency)}
        >
          {WORKSPACE_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {CURRENCY_LABELS[code]}
            </option>
          ))}
        </select>
        {saved && (
          <span className="text-xs font-medium text-emerald-700">Saved</span>
        )}
        {update.isPending && (
          <span className="text-xs text-body-muted">Saving…</span>
        )}
      </div>
    </div>
  );
}
