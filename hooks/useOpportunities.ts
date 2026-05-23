import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { OpportunityFormInput, OpportunityWithContact } from "@/types";

function pipelineQueryKey(pipelineId?: string) {
  return ["opportunities", pipelineId, undefined] as const;
}

export function useOpportunities(pipelineId?: string, contactId?: string) {
  return useQuery({
    queryKey: ["opportunities", pipelineId, contactId],
    queryFn: async () => {
      const { data } = await axios.get<{ data: OpportunityWithContact[] }>(
        "/api/opportunities",
        {
          params: {
            ...(pipelineId ? { pipeline_id: pipelineId } : {}),
            ...(contactId ? { contact_id: contactId } : {}),
          },
        }
      );
      return data.data;
    },
    enabled: !!(pipelineId || contactId),
  });
}

export function useCreateOpportunity(pipelineId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: OpportunityFormInput) =>
      axios.post<OpportunityWithContact>("/api/opportunities", input),
    onSuccess: async (response) => {
      const created = response.data;
      if (pipelineId) {
        const key = pipelineQueryKey(pipelineId);
        queryClient.setQueryData<OpportunityWithContact[]>(key, (old) => [
          created,
          ...(old ?? []),
        ]);
      }
      await queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useUpdateOpportunity(pipelineId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<OpportunityFormInput>;
    }) =>
      axios.patch<OpportunityWithContact>(`/api/opportunities/${id}`, data),
    onSuccess: async (response) => {
      const updated = response.data;
      if (pipelineId) {
        const key = pipelineQueryKey(pipelineId);
        queryClient.setQueryData<OpportunityWithContact[]>(key, (old) =>
          (old ?? []).map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useMoveOpportunityStage(pipelineId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      axios.patch<OpportunityWithContact>(`/api/opportunities/${id}`, { stage }),
    onMutate: async ({ id, stage }) => {
      if (!pipelineId) return {};
      const key = pipelineQueryKey(pipelineId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<OpportunityWithContact[]>(key);
      queryClient.setQueryData<OpportunityWithContact[]>(key, (old) =>
        (old ?? []).map((o) => (o.id === id ? { ...o, stage } : o))
      );
      return { previous, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous && context.key) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (response) => {
      const updated = response.data;
      if (pipelineId) {
        const key = pipelineQueryKey(pipelineId);
        queryClient.setQueryData<OpportunityWithContact[]>(key, (old) =>
          (old ?? []).map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useDeleteOpportunity(pipelineId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => axios.delete(`/api/opportunities/${id}`),
    onMutate: async (id) => {
      if (!pipelineId) return {};
      const key = pipelineQueryKey(pipelineId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<OpportunityWithContact[]>(key);
      queryClient.setQueryData<OpportunityWithContact[]>(key, (old) =>
        (old ?? []).filter((o) => o.id !== id)
      );
      return { previous, key };
    },
    onError: (_err, _id, context) => {
      if (context?.previous && context.key) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}
