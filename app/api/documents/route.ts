import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { documentCreateSchema, documentSchema } from "@/lib/validators";
import { buildDocumentRecord } from "@/lib/document-payload";
import { uploadToDocumentsBucket } from "@/lib/storage/documents";
import { batchResolveDocumentFileUrls } from "@/lib/storage/batch-signed-urls";
import { formatValidationDetails } from "@/lib/validation-errors";
import {
  assertParentsInWorkspace,
  workspaceParentForbidden,
} from "@/lib/api/assert-workspace-parents";
import {
  coerceQuoteDocumentType,
  isQuoteDocument,
  QUOTE_DOCUMENT_TYPES,
} from "@/lib/documents/kinds";
import { getDefaultQuoteTitle } from "@/lib/crm/quote-pdf-labels";
import {
  allocateQuoteReference,
  isGenericQuoteTitle,
  isQuoteReferenceConflict,
} from "@/lib/quotes/reference";

export async function GET(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const params = new URL(req.url).searchParams;
    const supabase = createServerSideClient();
    let query = supabase
      .from("documents")
      .select("*", { count: "exact" })
      .eq("user_id", workspaceOwnerId!)
      .order("created_at", { ascending: false });

    const contactId = params.get("contact_id");
    const companyId = params.get("company_id");
    const opportunityId = params.get("opportunity_id");
    const kind = params.get("kind");
    const billable = params.get("billable") === "1";
    const resolveFileUrls = params.get("resolve_file_urls") === "1";
    const page = Math.max(1, Number(params.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, Number(params.get("limit") || "100")));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    if (contactId) query = query.eq("contact_id", contactId);
    if (companyId) query = query.eq("company_id", companyId);
    if (opportunityId) query = query.eq("opportunity_id", opportunityId);
    if (kind === "quotes" || billable) {
      query = query.in("type", [...QUOTE_DOCUMENT_TYPES]);
    } else if (kind === "attachments") {
      query = query.eq("type", "attachment");
    }

    if (billable) {
      query = query.or("status.eq.accepted,status.eq.signed,accepted_at.not.is.null");
    }

    if (role === "sales" && !isWorkspaceOwner) {
      const [{ data: opps }, { data: contacts }] = await Promise.all([
        supabase
          .from("opportunities")
          .select("id")
          .eq("user_id", workspaceOwnerId!)
          .or(`owner_id.eq.${userId},owner_id.is.null`),
        supabase
          .from("contacts")
          .select("id")
          .eq("user_id", workspaceOwnerId!)
          .or(`assigned_to.eq.${userId},assigned_to.is.null`),
      ]);
      const oppIds = (opps ?? []).map((o) => o.id as string);
      const contactIds = (contacts ?? []).map((c) => c.id as string);
      const filters: string[] = ["and(contact_id.is.null,opportunity_id.is.null)"];
      if (oppIds.length > 0) filters.push(`opportunity_id.in.(${oppIds.join(",")})`);
      if (contactIds.length > 0) filters.push(`contact_id.in.(${contactIds.join(",")})`);
      query = query.or(filters.join(","));
    }

    const { data, error: dbError, count } = await query.range(from, to);
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
    let enriched = rows;
    if (resolveFileUrls) {
      const urls = await batchResolveDocumentFileUrls(supabase, rows);
      enriched = rows.map((row, i) => {
        const file_url = urls[i];
        return { ...row, file_url: file_url ?? row.file_url };
      });
    }

    return NextResponse.json({
      data: enriched,
      total: count ?? enriched.length,
      page,
      limit,
    });
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

    const createPayload = {
      ...parsed.data,
      type: coerceQuoteDocumentType(parsed.data.type) as typeof parsed.data.type,
    };

    const supabase = createServerSideClient();
    const parentCheck = await assertParentsInWorkspace(
      supabase,
      workspaceOwnerId!,
      createPayload
    );
    const parentError = workspaceParentForbidden(parentCheck);
    if (parentError) return parentError;

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
          workspaceOwnerId!,
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

    let title = createPayload.title.trim();
    let quoteReference: string | null = null;

    let quoteCurrency: "USD" | "MXN" | null = null;

    if (isQuoteDocument(createPayload.type)) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("ui_locale, default_currency")
        .eq("user_id", workspaceOwnerId!)
        .maybeSingle();

      const uiLocale = (settings?.ui_locale as string | null) ?? null;
      const defaultCurrency = (settings?.default_currency as string) === "MXN" ? "MXN" : "USD";
      quoteCurrency = defaultCurrency;
      quoteReference = await allocateQuoteReference(supabase, workspaceOwnerId!);
      if (isGenericQuoteTitle(title)) {
        title = getDefaultQuoteTitle(uiLocale, quoteReference);
      }
    }

    let record = {
      ...buildDocumentRecord({ ...createPayload, title }, workspaceOwnerId!, fileMeta),
      id: docId,
      storage_path: fileMeta?.storage_path ?? null,
      quote_reference: quoteReference,
      ...(quoteCurrency ? { currency: quoteCurrency } : {}),
    };

    let data = null as Record<string, unknown> | null;
    let dbError: { message: string } | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      if (isQuoteDocument(createPayload.type) && attempt > 0) {
        quoteReference = await allocateQuoteReference(supabase, workspaceOwnerId!);
        if (isGenericQuoteTitle(createPayload.title.trim())) {
          const { data: settings } = await supabase
            .from("user_settings")
            .select("ui_locale")
            .eq("user_id", workspaceOwnerId!)
            .maybeSingle();
          title = getDefaultQuoteTitle(
            (settings?.ui_locale as string | null) ?? null,
            quoteReference
          );
        }
        record = {
          ...record,
          title,
          quote_reference: quoteReference,
        };
      }

      const result = await supabase.from("documents").insert([record]).select().single();
      data = result.data;
      dbError = result.error;
      if (!dbError) break;
      if (!isQuoteReferenceConflict(dbError.message) || attempt >= 4) break;
    }

    if (dbError) {
      console.error("POST document db:", dbError);
      const hint = dbError.message.includes("documents_parent_check")
        ? "Run migration 012_relax_parent_checks.sql to allow standalone documents."
        : dbError.message.includes("attachment") ||
            dbError.message.includes("documents_type")
          ? "Run migration 005_object_associations.sql (attachment type)."
          : dbError.message.includes("storage_path")
            ? "Run migration 007_document_storage_path.sql."
            : isQuoteReferenceConflict(dbError.message)
              ? "Quote reference conflict. Try again or contact support."
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
