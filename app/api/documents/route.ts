import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { documentCreateSchema, documentSchema } from "@/lib/validators";
import { buildDocumentRecord } from "@/lib/document-payload";
import {
  resolveDocumentFileUrl,
  uploadToDocumentsBucket,
} from "@/lib/storage/documents";
import { formatValidationDetails } from "@/lib/validation-errors";
import { isQuoteDocument, QUOTE_DOCUMENT_TYPES } from "@/lib/documents/kinds";
import { getDefaultQuoteTitle } from "@/lib/crm/quote-pdf-labels";
import {
  allocateQuoteReference,
  isGenericQuoteTitle,
} from "@/lib/quotes/reference";

export async function GET(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const params = new URL(req.url).searchParams;
    const supabase = createServerSideClient();
    let query = supabase
      .from("documents")
      .select("*")
      .eq("user_id", workspaceOwnerId!)
      .order("created_at", { ascending: false });

    const contactId = params.get("contact_id");
    const companyId = params.get("company_id");
    const opportunityId = params.get("opportunity_id");
    const kind = params.get("kind");
    if (contactId) query = query.eq("contact_id", contactId);
    if (companyId) query = query.eq("company_id", companyId);
    if (opportunityId) query = query.eq("opportunity_id", opportunityId);
    if (kind === "quotes") {
      query = query.in("type", [...QUOTE_DOCUMENT_TYPES]);
    } else if (kind === "attachments") {
      query = query.eq("type", "attachment");
    }

    const { data, error: dbError } = await query;
    if (dbError) {
      console.error("GET /api/documents db:", dbError);
      return NextResponse.json(
        {
          error: dbError.message,
          hint: "Run migrations 005 and 007 in Supabase if columns are missing.",
        },
        { status: 500 }
      );
    }

    const rows = data ?? [];
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const file_url = await resolveDocumentFileUrl(
          supabase,
          row.storage_path as string | undefined,
          row.file_url as string | undefined
        );
        return { ...row, file_url: file_url ?? row.file_url };
      })
    );

    return NextResponse.json({ data: enriched });
  } catch (err) {
    console.error("GET /api/documents error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const contentType = req.headers.get("content-type") ?? "";
    let meta: unknown;
    let file: File | null = null;

    if (contentType.includes("application/json")) {
      meta = await req.json();
    } else {
      const formData = await req.formData();
      const metaRaw = formData.get("metadata");
      if (!metaRaw || typeof metaRaw !== "string") {
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
      }
      meta = JSON.parse(metaRaw);
      const f = formData.get("file");
      file = f instanceof File && f.size > 0 ? f : null;
    }

    const parsed = documentCreateSchema.safeParse(meta);
    if (!parsed.success) {
      const detailStr = formatValidationDetails(parsed.error.flatten());
      return NextResponse.json(
        {
          error: detailStr || "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const docId = crypto.randomUUID();

    let fileMeta:
      | {
          file_url: string;
          file_name: string;
          mime_type?: string;
          file_size_bytes?: number;
          storage_path: string;
        }
      | undefined;

    if (file && file instanceof File && file.size > 0) {
      try {
        const uploaded = await uploadToDocumentsBucket(
          supabase,
          userId!,
          docId,
          file
        );
        fileMeta = {
          storage_path: uploaded.storagePath,
          file_url: uploaded.fileUrl,
          file_name: file.name,
          mime_type: uploaded.mimeType,
          file_size_bytes: uploaded.sizeBytes,
        };
      } catch (uploadErr) {
        const message =
          uploadErr instanceof Error ? uploadErr.message : "Upload failed";
        console.error("Storage upload:", message);
        return NextResponse.json(
          {
            error:
              "File upload failed. Ensure the Supabase bucket 'crm_documents' exists and SUPABASE_SERVICE_ROLE_KEY is set.",
            details: message,
          },
          { status: 500 }
        );
      }
    }

    let title = parsed.data.title.trim();
    let quoteReference: string | null = null;

    if (isQuoteDocument(parsed.data.type)) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("ui_locale")
        .eq("user_id", workspaceOwnerId!)
        .maybeSingle();

      const uiLocale = (settings?.ui_locale as string | null) ?? null;
      quoteReference = await allocateQuoteReference(supabase, workspaceOwnerId!);
      if (isGenericQuoteTitle(title)) {
        title = getDefaultQuoteTitle(uiLocale, quoteReference);
      }
    }

    const record = {
      ...buildDocumentRecord({ ...parsed.data, title }, workspaceOwnerId!, fileMeta),
      id: docId,
      storage_path: fileMeta?.storage_path ?? null,
      quote_reference: quoteReference,
    };

    const { data, error: dbError } = await supabase
      .from("documents")
      .insert([record])
      .select()
      .single();

    if (dbError) {
      console.error("POST document db:", dbError);
      const hint = dbError.message.includes("documents_parent_check")
        ? "Run migration 012_relax_parent_checks.sql to allow standalone documents."
        : dbError.message.includes("attachment") ||
            dbError.message.includes("documents_type")
          ? "Run migration 005_object_associations.sql (attachment type)."
          : dbError.message.includes("storage_path")
            ? "Run migration 007_document_storage_path.sql."
            : undefined;
      return NextResponse.json(
        { error: dbError.message, hint },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/documents error:", err);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
