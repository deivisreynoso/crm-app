"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { HardDrive } from "lucide-react";
import { PageHeader } from "@/components/ui/page-shell";
import { GoogleDriveBrowser } from "@/components/media/google-drive-browser";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";

function MediaPageContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { dict } = useCrmLocale();
  const m = dict.media;
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const param = searchParams.get("google_drive");
    if (param === "connected") {
      setBanner(m?.connectedBanner ?? "Google Drive connected for this workspace.");
      void queryClient.invalidateQueries({
        queryKey: ["integration-google-drive-status"],
      });
      void queryClient.invalidateQueries({ queryKey: ["google-drive-files"] });
    } else if (param === "forbidden") {
      setError("Only workspace admins can connect Google Drive.");
    } else if (param === "error") {
      const reason = searchParams.get("reason");
      setError(
        reason === "migration"
          ? "Drive authorized but tokens could not be saved. Run migration 069_google_drive_integration.sql, then reconnect."
          : (m?.connectError ?? "Google Drive connection failed. Check OAuth settings and try again.")
      );
    }
  }, [searchParams, m?.connectedBanner, m?.connectError, queryClient]);

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title={m?.title ?? "Media"}
        description={
          m?.description ??
          "Browse your workspace Google Drive and link files to contacts."
        }
      />

      {banner && (
        <p className="text-sm text-emerald-700 bg-emerald-500/10 border border-emerald-200 rounded-lg px-3 py-2">
          {banner}
        </p>
      )}
      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="list-filters-panel overflow-hidden">
        <div className="list-filters-panel__accent" aria-hidden />
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--card-border)] bg-[var(--surface-subtle)]">
          <HardDrive className="h-4 w-4 text-[var(--secondary)]" />
          <span className="text-sm font-medium text-heading">
            {m?.driveSection ?? "Google Drive"}
          </span>
        </div>
        <GoogleDriveBrowser />
      </div>
    </div>
  );
}

export default function MediaPage() {
  return (
    <Suspense fallback={<p className="text-body-muted text-sm">Loading media…</p>}>
      <MediaPageContent />
    </Suspense>
  );
}
