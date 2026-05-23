import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { CalendarEvent, CalendarEventFormInput } from "@/types";

export function useCalendarEvents(filters?: {
  contact_id?: string;
  company_id?: string;
}) {
  return useQuery({
    queryKey: ["calendar", filters],
    queryFn: async () => {
      const { data } = await axios.get<{ data: CalendarEvent[] }>("/api/calendar", {
        params: filters,
      });
      return data.data;
    },
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CalendarEventFormInput) =>
      axios.post<CalendarEvent>("/api/calendar", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}
