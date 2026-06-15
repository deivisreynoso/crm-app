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

export function useGmailStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["gmail-status"],
    queryFn: async () => {
      const { data } = await axios.get<GmailStatus>(
        "/api/integrations/gmail/status"
      );
      return data;
    },
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
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

export function useTicketEmails(ticketId: string) {
  return useQuery({
    queryKey: ["ticket-emails", ticketId],
    queryFn: async () => {
      const { data } = await axios.get<{ data: ContactEmailMessage[] }>(
        `/api/tickets/${ticketId}/emails`
      );
      return data.data;
    },
    enabled: Boolean(ticketId),
  });
}

export function useSendTicketEmail(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GmailSendInput) => {
      if (!ticketId) {
        return Promise.reject(new Error("Missing ticket id"));
      }
      return axios.post(`/api/tickets/${ticketId}/emails/send`, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["ticket-emails", ticketId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["ticket-notes", ticketId],
      });
    },
  });
}

export function useSyncTicketEmails(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!ticketId) {
        return Promise.reject(new Error("Missing ticket id"));
      }
      return axios.post<{
        synced: number;
        listed?: number;
        contact_email?: string;
        hint?: string;
        error?: string;
        needs_reauth?: boolean;
      }>(`/api/tickets/${ticketId}/emails/sync`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["ticket-emails", ticketId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["ticket-notes", ticketId],
      });
    },
  });
}
