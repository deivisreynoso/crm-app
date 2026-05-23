import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Note } from "@/types";

export function useTicketNotes(ticketId: string) {
  return useQuery({
    queryKey: ["ticket-notes", ticketId],
    queryFn: async () => {
      const { data } = await axios.get<{ data: Note[] }>(
        `/api/tickets/${ticketId}/notes`
      );
      return data.data;
    },
    enabled: !!ticketId,
  });
}

export function useCreateTicketNote(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { content: string; activity_type: string }) =>
      axios.post(`/api/tickets/${ticketId}/notes`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-notes", ticketId] });
    },
  });
}
