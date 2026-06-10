"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import {
  useUpdateWorkspaceSettings,
  useWorkspaceSettings,
} from "@/hooks/useWorkspaceSettings";
import {
  QUOTE_LOGO_ACCEPT,
  QUOTE_LOGO_MAX_HEIGHT,
  QUOTE_LOGO_MAX_WIDTH,
} from "@/lib/storage/quote-logo";
import { formatApiError } from "@/lib/validation-errors";
import axios from "axios";

export function QuoteBrandingSettings() {
  const { dict } = useCrmLocale();
  const { data: settings, refetch } = useWorkspaceSettings();
  const update = useUpdateWorkspaceSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const [companyName, setCompanyName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1e3a5f");
  const [fontFamily, setFontFamily] = useState("Helvetica");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCompanyName(settings?.quote_company_name ?? "");
    setPrimaryColor(settings?.quote_primary_color ?? "#1e3a5f");
    setFontFamily(settings?.quote_font_family ?? "Helvetica");
  }, [settings?.quote_company_name, settings?.quote_primary_color, settings?.quote_font_family]);

  const displayName = companyName;

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      await axios.post("/api/settings/quote-logo", form);
      await refetch();
    } catch (err) {
      setError(formatApiError(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveLogo() {
    setError(null);
    try {
      await axios.delete("/api/settings/quote-logo");
      await refetch();
    } catch (err) {
      setError(formatApiError(err, "Could not remove logo"));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-body-muted">
        {dict.settings?.quoteBrandingHelp}
      </p>

      <div className="flex flex-wrap items-start gap-4">
        <div
          className="border border-dashed border-[var(--card-border)] rounded-lg bg-[var(--background)] flex items-center justify-center overflow-hidden"
          style={{
            width: QUOTE_LOGO_MAX_WIDTH,
            height: QUOTE_LOGO_MAX_HEIGHT,
            maxWidth: "100%",
          }}
        >
          {settings?.quote_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.quote_logo_url}
              alt="Quote logo"
              className="object-contain max-h-[120px] max-w-[400px] w-auto h-auto p-2"
            />
          ) : (
            <span className="text-xs text-body-muted px-4 text-center">
              {QUOTE_LOGO_MAX_WIDTH}×{QUOTE_LOGO_MAX_HEIGHT} px
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={QUOTE_LOGO_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading
              ? "…"
              : dict.settings?.uploadLogo ?? "Upload logo"}
          </Button>
          {settings?.quote_logo_url && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-[var(--error)]"
              onClick={() => void handleRemoveLogo()}
            >
              {dict.settings?.removeLogo ?? "Remove logo"}
            </Button>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-heading block mb-1">
          {dict.settings?.companyName ?? "Company name on quotes"}
        </label>
        <input
          className="input-field w-full max-w-md"
          value={displayName}
          onChange={(e) => setCompanyName(e.target.value)}
          onBlur={() => {
            const next = companyName.trim();
            if (next !== (settings?.quote_company_name ?? "")) {
              void update.mutateAsync({ quote_company_name: next || "" });
            }
          }}
          placeholder="ClickIn 360"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <div>
          <label className="text-sm font-medium text-heading block mb-1">
            Primary color
          </label>
          <input
            type="color"
            className="h-10 w-full rounded border border-[var(--card-border)]"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            onBlur={() => {
              if (primaryColor !== (settings?.quote_primary_color ?? "#1e3a5f")) {
                void update.mutateAsync({ quote_primary_color: primaryColor });
              }
            }}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-heading block mb-1">
            Typography
          </label>
          <select
            className="input-field w-full"
            value={fontFamily}
            onChange={(e) => {
              const next = e.target.value;
              setFontFamily(next);
              void update.mutateAsync({ quote_font_family: next });
            }}
          >
            <option value="Helvetica">Helvetica</option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times New Roman</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}
    </div>
  );
}
