import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { DriveFileItem } from "@/lib/google/drive";

export type GoogleDriveStatus = {
  connected: boolean;
  configured: boolean;
  redirect_uri?: string;
  email?: string | null;
  root_folder_id?: string | null;
  workspace?: boolean;
  connect_path?: string;
  disconnect_path?: string;
};

export function useGoogleDriveStatus() {
  return useQuery({
    queryKey: ["integration-google-drive-status"],
    queryFn: async () => {
      const { data } = await axios.get<GoogleDriveStatus>(
        "/api/integrations/google-drive/status"
      );
      return data;
    },
    staleTime: 60_000,
  });
}

export function useGoogleDriveFiles(
  folderId?: string | null,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ["google-drive-files", folderId ?? "root"],
    queryFn: async () => {
      const { data } = await axios.get<{
        files: DriveFileItem[];
        parent_id: string;
      }>("/api/integrations/google-drive/files", {
        params: folderId ? { folder_id: folderId } : {},
      });
      return data;
    },
    enabled,
    retry: false,
  });
}

export function useLinkGoogleDriveFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      file_id: string;
      contact_id: string;
      company_id?: string;
      opportunity_id?: string;
    }) => axios.post("/api/integrations/google-drive/link", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDisconnectGoogleDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => axios.delete("/api/integrations/google-drive/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-google-drive-status"] });
      queryClient.invalidateQueries({ queryKey: ["google-drive-files"] });
    },
  });
}
