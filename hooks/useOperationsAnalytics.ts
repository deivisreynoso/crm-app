import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { OperationsMetrics } from "@/types";

export function useOperationsAnalytics(filters?: {
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["analytics", "operations", filters],
    queryFn: async () => {
      const { data } = await axios.get<OperationsMetrics>(
        "/api/analytics/operations",
        { params: filters }
      );
      return data;
    },
  });
}
