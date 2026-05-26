"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { TeamRole } from "@/lib/team/workspace";

export type WorkspaceContext = {
  workspaceOwnerId: string;
  role: TeamRole;
  isWorkspaceOwner: boolean;
  actorUserId: string;
  canWrite: boolean;
  canManage: boolean;
  isDemoViewer: boolean;
};

export function useWorkspaceContext() {
  return useQuery({
    queryKey: ["workspace-context"],
    queryFn: async () => {
      const { data } = await axios.get<WorkspaceContext>("/api/workspace/context");
      return data;
    },
    staleTime: 60_000,
  });
}
