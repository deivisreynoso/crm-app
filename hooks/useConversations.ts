import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  ConversationListItem,
  ConversationMessageRow,
  ConversationQualification,
  ConversationRow,
} from "@/lib/conversations/types";

export type ConversationDetail = ConversationRow & {
  messages: ConversationMessageRow[];
};

export function useConversations(filters?: {
  channel?: string;
  status?: string;
  human_review?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["conversations", filters],
    queryFn: async () => {
      const { data } = await axios.get<{
        data: ConversationListItem[];
        total: number;
        page: number;
        limit: number;
      }>("/api/conversations", { params: filters });
      return data;
    },
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ["conversation", id],
    queryFn: async () => {
      const { data } = await axios.get<ConversationDetail>(`/api/conversations/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useConversationMessagesAfter(
  conversationId: string | null,
  afterMessageId: string | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["conversation-messages", conversationId, afterMessageId],
    queryFn: async () => {
      const { data } = await axios.get<{ data: ConversationMessageRow[] }>(
        `/api/conversations/${conversationId}/messages`,
        { params: afterMessageId ? { after: afterMessageId } : undefined }
      );
      return data.data;
    },
    enabled: Boolean(conversationId) && enabled,
    refetchInterval: enabled ? 3000 : false,
  });
}

export function useTakeoverConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.post(`/api/conversations/${id}/takeover`),
    onSuccess: (_res, id) => {
      void qc.invalidateQueries({ queryKey: ["conversation", id] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useReleaseConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.post(`/api/conversations/${id}/release`),
    onSuccess: (_res, id) => {
      void qc.invalidateQueries({ queryKey: ["conversation", id] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSendConversationMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      axios.post<ConversationMessageRow>(
        `/api/conversations/${conversationId}/messages`,
        { body }
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["conversation", conversationId] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      void qc.invalidateQueries({ queryKey: ["conversation-messages", conversationId] });
    },
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/api/conversations/${id}`),
    onSuccess: (_res, id) => {
      void qc.removeQueries({ queryKey: ["conversation", id] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export type { ConversationQualification };
