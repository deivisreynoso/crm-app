import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  DEFAULT_LOSS_REASON_OPTIONS,
  normalizeLossReasonOptions,
  type LossReasonOption,
} from "@/lib/constants/loss-reasons";

type AutomationsSettings = {
  loss_reason_options?: unknown[];
};

export function useLossReasonOptions() {
  return useQuery({
    queryKey: ["loss-reason-options"],
    queryFn: async () => {
      const { data } = await axios.get<AutomationsSettings>(
        "/api/settings/automations"
      );
      return normalizeLossReasonOptions(data.loss_reason_options);
    },
    staleTime: 5 * 60_000,
    placeholderData: DEFAULT_LOSS_REASON_OPTIONS as LossReasonOption[],
  });
}
