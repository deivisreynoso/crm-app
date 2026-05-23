import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { PipelineAnalytics } from "@/types";

export function usePipelineAnalytics(
  pipelineId?: string,
  filters?: { start_date?: string; end_date?: string }
) {
  return useQuery({
    queryKey: ["analytics", "pipeline", pipelineId, filters],
    queryFn: async () => {
      const { data } = await axios.get<PipelineAnalytics>("/api/analytics/pipeline", {
        params: {
          ...(pipelineId ? { pipeline_id: pipelineId } : {}),
          ...filters,
        },
      });
      return data;
    },
  });
}
