import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { WorkspaceCurrency } from "@/lib/constants/currencies";

export interface WorkspaceSettings {
  default_currency: WorkspaceCurrency;
  updated_at?: string;
}

export function useWorkspaceSettings() {
  return useQuery({
    queryKey: ["workspace-settings"],
    queryFn: async () => {
      const { data } = await axios.get<WorkspaceSettings>("/api/settings");
      return data;
    },
  });
}

export function useUpdateWorkspaceSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: { default_currency: WorkspaceCurrency }) =>
      axios.patch<WorkspaceSettings>("/api/settings", patch),
    onSuccess: (res) => {
      queryClient.setQueryData(["workspace-settings"], res.data);
    },
  });
}
