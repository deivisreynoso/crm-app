import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { CrmDocument, DocumentFormInput } from "@/types";

import { formatApiError } from "@/lib/validation-errors";

export function uploadErrorMessage(err: unknown): string {
  return formatApiError(err, "Upload failed");
}

export function useDocuments(filters?: {
  contact_id?: string;
  company_id?: string;
  opportunity_id?: string;
  kind?: "quotes" | "attachments";
  resolve_file_urls?: boolean;
}) {
  return useQuery({
    queryKey: ["documents", filters],
    queryFn: async () => {
      const { data } = await axios.get<{ data: CrmDocument[] }>("/api/documents", {
        params: {
          ...filters,
          ...(filters?.resolve_file_urls ? { resolve_file_urls: "1" } : {}),
        },
      });
      return data.data;
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      metadata,
      file,
    }: {
      metadata: DocumentFormInput;
      file?: File | null;
    }) => {
      const formData = new FormData();
      formData.append("metadata", JSON.stringify(metadata));
      if (file) formData.append("file", file);
      const { data } = await axios.post<CrmDocument>("/api/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["company-related"] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/api/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
