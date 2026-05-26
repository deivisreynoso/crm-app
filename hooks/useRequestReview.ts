import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export function useRequestReview(contactId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input?: { ticket_id?: string }) =>
      axios.post(`/api/contacts/${contactId}/request-review`, input ?? {}),
    onSuccess: (_res, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      void queryClient.invalidateQueries({
        queryKey: ["contact-activity-feed", contactId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["contact-emails", contactId],
      });
      if (variables?.ticket_id) {
        void queryClient.invalidateQueries({
          queryKey: ["ticket-notes", variables.ticket_id],
        });
        void queryClient.invalidateQueries({
          queryKey: ["ticket-emails", variables.ticket_id],
        });
      }
    },
  });
}
