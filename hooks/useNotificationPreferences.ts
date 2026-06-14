import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { NotificationPreferencesFormData } from "@/lib/validators";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  task_reminders: boolean;
  opportunity_reminders: boolean;
  ticket_notifications: boolean;
  email_notifications: boolean;
  conversation_notifications?: boolean;
  sales_notifications?: boolean;
  support_notifications?: boolean;
  email_frequency: string;
  timezone: string;
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data } = await axios.get<NotificationPreferences>(
        "/api/notification-preferences"
      );
      return data;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: NotificationPreferencesFormData) =>
      axios.patch<NotificationPreferences>("/api/notification-preferences", patch),
    onSuccess: (res) => {
      queryClient.setQueryData(["notification-preferences"], res.data);
    },
  });
}
