import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import type { EmailTemplate } from "@/hooks/useEmailTemplates";

export function useReviewEmailTemplate() {
  const { data: settings } = useWorkspaceSettings();
  const templateId = settings?.review_request_template_id ?? null;

  return useQuery({
    queryKey: ["review-email-template", templateId],
    queryFn: async () => {
      if (!templateId) return null;
      const { data } = await axios.get<EmailTemplate>(
        `/api/email-templates/${templateId}`
      );
      return data;
    },
    enabled: Boolean(templateId),
  });
}
