import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Ticket, TicketFormInput } from "@/types";

export function useTickets(
  filters?: {
    contact_id?: string;
    company_id?: string;
    status?: string;
    created_from?: string;
    created_to?: string;
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["tickets", filters],
    queryFn: async () => {
      const { data } = await axios.get<{ data: Ticket[] }>("/api/tickets", {
        params: filters,
      });
      return data.data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const { data } = await axios.get<Ticket>(`/api/tickets/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TicketFormInput) =>
      axios.post<Ticket>("/api/tickets", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

export function useUpdateTicket(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<TicketFormInput>) =>
      axios.patch<Ticket>(`/api/tickets/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/api/tickets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}
