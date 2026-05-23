import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildTemplateContext,
  interpolateTemplate,
  type TemplateContext,
} from "@/lib/documents/template-variables";

export async function loadDocumentTemplateContext(
  supabase: SupabaseClient,
  doc: {
    contact_id?: string | null;
    company_id?: string | null;
    opportunity_id?: string | null;
    title?: string;
    valid_until?: string | null;
  }
): Promise<TemplateContext> {
  let contact = null;
  let company = null;
  let opportunity = null;

  if (doc.contact_id) {
    const { data } = await supabase
      .from("contacts")
      .select("first_name, last_name, email, phone, company")
      .eq("id", doc.contact_id)
      .maybeSingle();
    contact = data;
  }

  if (doc.company_id) {
    const { data } = await supabase
      .from("companies")
      .select("name")
      .eq("id", doc.company_id)
      .maybeSingle();
    company = data;
  }

  if (doc.opportunity_id) {
    const { data } = await supabase
      .from("opportunities")
      .select("title, value, currency")
      .eq("id", doc.opportunity_id)
      .maybeSingle();
    opportunity = data;
  }

  return buildTemplateContext({
    contact: contact ?? undefined,
    company: company ?? undefined,
    opportunity: opportunity ?? undefined,
    document: { title: doc.title, valid_until: doc.valid_until ?? undefined },
  });
}

export async function resolveDocumentContent(
  supabase: SupabaseClient,
  doc: {
    content?: string | null;
    contact_id?: string | null;
    company_id?: string | null;
    opportunity_id?: string | null;
    title?: string;
    valid_until?: string | null;
  }
): Promise<string> {
  const raw = doc.content?.trim() ?? "";
  if (!raw) return "";
  const ctx = await loadDocumentTemplateContext(supabase, doc);
  return interpolateTemplate(raw, ctx);
}
