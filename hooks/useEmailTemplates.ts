import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { EmailTemplateFormData } from "@/lib/validators";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category?: string | null;
  is_default?: boolean;
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data } = await axios.get<{ data: EmailTemplate[] }>(
        "/api/email-templates"
      );
      return data.data;
    },
  });
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EmailTemplateFormData) =>
      axios.post<EmailTemplate>("/api/email-templates", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-templates"] }),
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/api/email-templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-templates"] }),
  });
}
