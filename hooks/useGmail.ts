import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { GmailSendInput } from "@/lib/validators";

export type GmailStatus = {
  connected: boolean;
  configured: boolean;
  redirect_uri?: string;
  email: string | null;
  read_access?: boolean;
};

export function useGmailStatus() {
  return useQuery({
    queryKey: ["gmail-status"],
    queryFn: async () => {
      const { data } = await axios.get<GmailStatus>(
        "/api/integrations/gmail/status"
      );
      return data;
    },
    staleTime: 60_000,
  });
}

export function useSendContactEmail(contactId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GmailSendInput) =>
      axios.post(`/api/contacts/${contactId}/emails/send`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["contact-activity-feed", contactId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["contact-emails", contactId],
      });
    },
  });
}

export type ContactEmailMessage = {
  id: string;
  direction: "outbound" | "inbound";
  gmail_message_id: string;
  gmail_thread_id?: string | null;
  from_email?: string | null;
  to_email?: string | null;
  subject?: string | null;
  body: string;
  sent_at: string;
};

export function useContactEmails(contactId: string) {
  return useQuery({
    queryKey: ["contact-emails", contactId],
    queryFn: async () => {
      const { data } = await axios.get<{ data: ContactEmailMessage[] }>(
        `/api/contacts/${contactId}/emails`
      );
      return data.data;
    },
    enabled: Boolean(contactId),
  });
}

export function useSyncContactEmails(contactId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      axios.post<{
        synced: number;
        listed?: number;
        contact_email?: string;
        hint?: string;
        error?: string;
        needs_reauth?: boolean;
      }>(`/api/contacts/${contactId}/emails/sync`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["contact-emails", contactId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["contact-activity-feed", contactId],
      });
    },
  });
}
