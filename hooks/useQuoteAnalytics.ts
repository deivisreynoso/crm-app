import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { QuoteAnalytics } from "@/lib/quotes/analytics";

export function useQuoteAnalytics() {
  return useQuery({
    queryKey: ["quote-analytics"],
    queryFn: async () => {
      const { data } = await axios.get<{ data: QuoteAnalytics }>(
        "/api/quotes/analytics"
      );
      return data.data;
    },
  });
}
