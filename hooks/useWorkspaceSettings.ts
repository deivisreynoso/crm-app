import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { WorkspaceCurrency } from "@/lib/constants/currencies";

import type { BookingAvailabilityConfig } from "@/lib/website/booking-availability";

export interface WorkspaceSettings {
  default_currency: WorkspaceCurrency;
  default_sales_assignee?: string | null;
  booking_availability?: BookingAvailabilityConfig;
  ui_locale?: "en" | "es";
  quote_logo_storage_path?: string | null;
  quote_logo_url?: string | null;
  quote_company_name?: string | null;
  google_reviews_url?: string | null;
  review_request_template_id?: string | null;
  updated_at?: string;
}

export function useWorkspaceSettings() {
  return useQuery({
    queryKey: ["workspace-settings"],
    queryFn: async () => {
      const { data } = await axios.get<WorkspaceSettings>("/api/settings");
      return data;
    },
  });
}

export function useUpdateWorkspaceSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: {
      default_currency?: WorkspaceCurrency;
      default_sales_assignee?: string | null;
      booking_availability?: BookingAvailabilityConfig;
      quote_company_name?: string;
      google_reviews_url?: string;
      review_request_template_id?: string | null;
    }) => axios.patch<WorkspaceSettings>("/api/settings", patch),
    onSuccess: (res) => {
      queryClient.setQueryData(["workspace-settings"], res.data);
    },
  });
}
