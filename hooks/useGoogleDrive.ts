import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { DriveFileItem, DriveSharedDrive } from "@/lib/google/drive";

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

export function useGoogleSharedDrives(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ["google-drive-shared-drives"],
    queryFn: async () => {
      const { data } = await axios.get<{ drives: DriveSharedDrive[] }>(
        "/api/integrations/google-drive/drives"
      );
      return data;
    },
    enabled,
    retry: false,
  });
}

export function useGoogleDriveFiles(
  folderId?: string | null,
  options?: { enabled?: boolean; driveId?: string | null }
) {
  const enabled = options?.enabled ?? true;
  const driveId = options?.driveId ?? null;
  return useQuery({
    queryKey: ["google-drive-files", driveId ?? "my", folderId ?? "root"],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (folderId) params.folder_id = folderId;
      if (driveId) params.drive_id = driveId;
      const { data } = await axios.get<{
        files: DriveFileItem[];
        parent_id: string;
      }>("/api/integrations/google-drive/files", { params });
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
      queryClient.invalidateQueries({ queryKey: ["google-drive-shared-drives"] });
    },
  });
}

export function useCreateGoogleDriveFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      folder_id?: string | null;
      drive_id?: string | null;
    }) => axios.post("/api/integrations/google-drive/folders", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-drive-files"] });
    },
  });
}

export function useUploadGoogleDriveFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      file: File;
      folder_id?: string | null;
      drive_id?: string | null;
    }) => {
      const form = new FormData();
      form.append("file", input.file);
      if (input.folder_id) form.append("folder_id", input.folder_id);
      if (input.drive_id) form.append("drive_id", input.drive_id);
      return axios.post("/api/integrations/google-drive/upload", form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-drive-files"] });
    },
  });
}
