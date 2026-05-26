import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Pipeline, PipelineStage } from "@/types";

export function usePipelines() {
  return useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const { data } = await axios.get<{ data: Pipeline[] }>("/api/pipelines");
      if (data.data.length > 0) return data.data;
      const seeded = await axios.post<{ data: Pipeline[] }>("/api/pipelines/seed");
      return seeded.data.data;
    },
  });
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; stages: PipelineStage[] }) =>
      axios.post<Pipeline>("/api/pipelines", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
  });
}

export function useUpdatePipeline(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Partial<{ name: string; stages: PipelineStage[] }>) =>
      axios.patch<Pipeline>(`/api/pipelines/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
  });
}

export function useDeletePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => axios.delete(`/api/pipelines/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
  });
}
