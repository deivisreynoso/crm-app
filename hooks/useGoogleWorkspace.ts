import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { GoogleWorkspaceSetupResponse } from "@/lib/google/workspace-setup";

export function useGoogleWorkspaceSetup() {
  return useQuery({
    queryKey: ["google-workspace-setup"],
    queryFn: async () => {
      const { data } = await axios.get<GoogleWorkspaceSetupResponse>(
        "/api/integrations/google-workspace/setup"
      );
      return data;
    },
    staleTime: 30_000,
  });
}
