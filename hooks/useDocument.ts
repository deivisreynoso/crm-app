import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { CrmDocument } from "@/types";

export function useDocument(id: string) {
  return useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      const { data } = await axios.get<CrmDocument>(`/api/documents/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<CrmDocument>) =>
      axios.patch<CrmDocument>(`/api/documents/${id}`, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", id] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useGenerateDocumentPdf(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      axios.post<{ file_url: string; file_name: string }>(
        `/api/documents/${id}/pdf`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", id] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export type SendDocumentViaGmailInput = {
  to?: string;
  subject?: string;
  body?: string;
};

export function useSendDocumentViaGmail(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input?: SendDocumentViaGmailInput) =>
      axios.post<{
        success: boolean;
        message_id: string;
        from_email: string | null;
        pdf_file_name: string;
      }>(`/api/documents/${id}/send-via-gmail`, input ?? {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", id] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
