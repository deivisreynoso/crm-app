import { useWorkspace } from "@/components/crm/workspace-provider";

/** Workspace role capabilities for CRM UI (owner, admin, sales, viewer). */
export function useWorkspaceCapabilities() {
  const { ctx, isLoading } = useWorkspace();
  return {
    isLoading,
    role: ctx?.role,
    canWrite: ctx?.canWrite ?? false,
    canManage: ctx?.canManage ?? false,
    isDemoViewer: ctx?.isDemoViewer ?? false,
    canAccessFinances: ctx?.canAccessFinances ?? false,
    canExport: ctx?.canExport ?? false,
    canManageRoles: ctx?.canManageRoles ?? false,
  };
}
