"use client";

import { useWorkspace } from "@/components/crm/workspace-provider";

export function DemoModeBanner() {
  const { ctx, isLoading, demoNotice, clearDemoNotice } = useWorkspace();

  if (isLoading || !ctx?.isDemoViewer) return null;

  return (
    <div className="shrink-0 border-b border-amber-200/80 bg-amber-50 px-6 lg:px-10 py-2.5 text-sm text-amber-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          <span className="font-semibold">Demo viewer</span>
          {" — "}
          You can explore the CRM; saves and deletes are simulated and do not change data.
        </p>
        {demoNotice ? (
          <button
            type="button"
            className="text-xs font-medium underline underline-offset-2"
            onClick={clearDemoNotice}
          >
            Dismiss
          </button>
        ) : null}
      </div>
      {demoNotice ? (
        <p className="mt-1 text-xs text-amber-900/90">{demoNotice}</p>
      ) : null}
    </div>
  );
}
