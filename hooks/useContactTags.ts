import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { ContactTagFormData } from "@/lib/validators";

export interface ContactTag {
  id: string;
  name: string;
  color: string;
}

export function useContactTags() {
  return useQuery({
    queryKey: ["contact-tags"],
    queryFn: async () => {
      const { data } = await axios.get<{ data: ContactTag[] }>("/api/contact-tags");
      return data.data;
    },
  });
}

export function useCreateContactTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ContactTagFormData) =>
      axios.post<ContactTag>("/api/contact-tags", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contact-tags"] }),
  });
}

export function useDeleteContactTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/api/contact-tags/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contact-tags"] }),
  });
}
