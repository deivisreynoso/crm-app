import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { OpportunityFormInput, OpportunityWithContact } from "@/types";

function pipelineQueryKey(pipelineId?: string) {
  return ["opportunities", pipelineId, undefined] as const;
}

export interface OpportunityListFilters {
  stage?: string;
  search?: string;
  createdFrom?: string;
  createdTo?: string;
  includeContactCounts?: boolean;
}

export function useOpportunities(
  pipelineId?: string,
  contactId?: string,
  filters: OpportunityListFilters = {}
) {
  return useQuery({
    queryKey: ["opportunities", pipelineId, contactId, filters],
    queryFn: async () => {
      const { data } = await axios.get<{ data: OpportunityWithContact[] }>(
        "/api/opportunities",
        {
          params: {
            ...(pipelineId ? { pipeline_id: pipelineId } : {}),
            ...(contactId ? { contact_id: contactId } : {}),
            ...(filters.stage ? { stage: filters.stage } : {}),
            ...(filters.search ? { search: filters.search } : {}),
            ...(filters.createdFrom ? { created_from: filters.createdFrom } : {}),
            ...(filters.createdTo ? { created_to: filters.createdTo } : {}),
            ...(filters.includeContactCounts
              ? { include_contact_counts: "1" }
              : {}),
          },
        }
      );
      return data.data;
    },
    enabled: !!(pipelineId || contactId),
  });
}

/** List opportunities for calendar linking (optional contact filter). */
export function useOpportunityPicker(contactId?: string) {
  return useQuery({
    queryKey: ["opportunities", "picker", contactId ?? "all"],
    queryFn: async () => {
      const { data } = await axios.get<{ data: OpportunityWithContact[] }>(
        "/api/opportunities",
        {
          params: contactId ? { contact_id: contactId } : {},
        }
      );
      return data.data;
    },
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
    mutationFn: ({
      id,
      stage,
      loss_reason,
      loss_reason_notes,
    }: {
      id: string;
      stage: string;
      loss_reason?: string;
      loss_reason_notes?: string;
    }) =>
      axios.patch<OpportunityWithContact>(`/api/opportunities/${id}`, {
        stage,
        ...(loss_reason ? { loss_reason } : {}),
        ...(loss_reason_notes ? { loss_reason_notes } : {}),
      }),
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
      queryClient.invalidateQueries({ queryKey: ["analytics", "pipeline"] });
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
