import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface DocumentVersion {
  id: string;
  version_number: number;
  content?: string | null;
  file_url?: string | null;
  created_at: string;
}

export function useDocumentVersions(documentId: string) {
  return useQuery({
    queryKey: ["document-versions", documentId],
    queryFn: async () => {
      const { data } = await axios.get<{ data: DocumentVersion[] }>(
        `/api/documents/${documentId}/versions`
      );
      return data.data;
    },
    enabled: !!documentId,
  });
}
