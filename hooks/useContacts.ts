import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Contact, ContactFormInput, Note, Task } from "@/types";

interface ContactsResponse {
  data: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ContactsListFilters {
  search?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
}

export function useContacts(
  page = 1,
  limit = 20,
  filters: ContactsListFilters = {}
) {
  const { search, status, createdFrom, createdTo } = filters;
  return useQuery({
    queryKey: ["contacts", page, limit, search, status, createdFrom, createdTo],
    queryFn: async () => {
      const { data } = await axios.get<ContactsResponse>("/api/contacts", {
        params: {
          page,
          limit,
          search,
          status,
          created_from: createdFrom,
          created_to: createdTo,
        },
      });
      return data;
    },
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contact: ContactFormInput) =>
      axios.post<Contact>("/api/contacts", contact),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      const { data } = await axios.get<Contact>(`/api/contacts/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateContact(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contact: Partial<ContactFormInput>) =>
      axios.patch<Contact>(`/api/contacts/${id}`, contact),
    onSuccess: (response) => {
      queryClient.setQueryData(["contact", id], response.data);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => axios.delete(`/api/contacts/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["contacts"] });
      const previous = queryClient.getQueriesData<ContactsResponse>({
        queryKey: ["contacts"],
      });

      queryClient.setQueriesData<ContactsResponse>(
        { queryKey: ["contacts"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((c) => c.id !== id),
            pagination: {
              ...old.pagination,
              total: Math.max(0, old.pagination.total - 1),
            },
          };
        }
      );

      queryClient.removeQueries({ queryKey: ["contact", id] });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useContactNotes(contactId: string) {
  return useQuery({
    queryKey: ["contact-notes", contactId],
    queryFn: async () => {
      const { data } = await axios.get<{ data: Note[] }>(
        `/api/contacts/${contactId}/notes`
      );
      return data.data;
    },
    enabled: !!contactId,
  });
}

export function useCreateContactNote(contactId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { content: string; activity_type: string }) =>
      axios.post(`/api/contacts/${contactId}/notes`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-notes", contactId] });
    },
  });
}

export function useContactTasks(contactId: string) {
  return useQuery({
    queryKey: ["contact-tasks", contactId],
    queryFn: async () => {
      const { data } = await axios.get<{ data: Task[] }>(
        `/api/contacts/${contactId}/tasks`
      );
      return data.data;
    },
    enabled: !!contactId,
  });
}

export function useCreateContactTask(contactId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: {
      title: string;
      description?: string;
      priority?: string;
      due_date?: string;
    }) => axios.post(`/api/contacts/${contactId}/tasks`, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-tasks", contactId] });
    },
  });
}
