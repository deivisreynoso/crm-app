"use client";

import { Suspense } from "react";
import { IntegrationsHub } from "@/components/settings/integrations-hub";

export function SettingsIntegrationsSection() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-body-muted">Loading integrations…</p>
      }
    >
      <IntegrationsHub />
    </Suspense>
  );
}
