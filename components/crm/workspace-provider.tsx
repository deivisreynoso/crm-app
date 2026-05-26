"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import {
  useWorkspaceContext,
  type WorkspaceContext,
} from "@/hooks/useWorkspaceContext";

type WorkspaceProviderValue = {
  ctx: WorkspaceContext | undefined;
  isLoading: boolean;
  demoNotice: string | null;
  clearDemoNotice: () => void;
};

const WorkspaceCtx = createContext<WorkspaceProviderValue | null>(null);

const VIEWER_WRITE_ALLOWLIST = ["/api/account/profile", "/api/account/password"];

function isDemoMutation(url: string, method: string) {
  const m = method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(m)) return false;
  if (VIEWER_WRITE_ALLOWLIST.some((p) => url.includes(p))) return false;
  return true;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data: ctx, isLoading } = useWorkspaceContext();
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const clearDemoNotice = useCallback(() => setDemoNotice(null), []);

  useEffect(() => {
    if (!ctx?.isDemoViewer) return;

    const interceptor = axios.interceptors.request.use((config) => {
      const url = config.url ?? "";
      const method = (config.method ?? "get").toUpperCase();
      if (!isDemoMutation(url, method)) return config;

      setDemoNotice(
        "Demo mode — this change was not saved. Viewer accounts cannot modify workspace data."
      );

      config.adapter = () =>
        Promise.resolve({
          data: { demo: true, ok: true },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        });

      return config;
    });

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [ctx?.isDemoViewer]);

  const value = useMemo(
    () => ({
      ctx,
      isLoading,
      demoNotice,
      clearDemoNotice,
    }),
    [ctx, isLoading, demoNotice, clearDemoNotice]
  );

  return (
    <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>
  );
}

export function useWorkspace() {
  const value = useContext(WorkspaceCtx);
  if (!value) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return value;
}
