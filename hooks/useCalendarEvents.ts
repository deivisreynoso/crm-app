import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { CalendarEvent, CalendarEventFormInput } from "@/types";

export function useCalendarEvents(filters?: {
  contact_id?: string;
  company_id?: string;
  opportunity_id?: string;
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["calendar-events", filters],
    queryFn: async () => {
      const { data } = await axios.get<{ data: CalendarEvent[] }>(
        "/api/calendar/events",
        { params: filters }
      );
      return data.data;
    },
  });
}

export function useCalendarEvent(id: string) {
  return useQuery({
    queryKey: ["calendar-event", id],
    queryFn: async () => {
      const { data } = await axios.get<CalendarEvent>(`/api/calendar/events/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CalendarEventFormInput) =>
      axios.post<CalendarEvent>("/api/calendar/events", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CalendarEventFormInput>;
    }) => axios.patch<CalendarEvent>(`/api/calendar/events/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/api/calendar/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}
