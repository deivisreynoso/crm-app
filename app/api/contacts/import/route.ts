import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceWrite } from "@/lib/api/auth";
import { buildContactRecord } from "@/lib/contact-payload";
import { normalizeImportRow, parseCsv } from "@/lib/contacts/csv";
import {
  contactImportRowSchema,
  importRowToContactInput,
} from "@/lib/contacts/import-contact-row";
import {
  duplicateContactMessage,
  findDuplicateContact,
} from "@/lib/identity/contact-duplicate";
import { contactWriteErrorMessage } from "@/lib/identity/duplicate-errors";
import { triggerN8NWebhook } from "@/lib/n8n";
import { createServerSideClient } from "@/lib/supabase";
import {
  formatValidationDetails,
  humanizeDbError,
} from "@/lib/validation-errors";
import { recordAuditLog } from "@/lib/audit/record";

const MAX_IMPORT_ROWS = 500;

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, error } = await requireAuth();
    if (error) return error;

    const writeError = requireWorkspaceWrite(role!);
    if (writeError) return writeError;

    const contentType = req.headers.get("content-type") ?? "";
    let rawRows: Record<string, string>[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
      }
      const text = await file.text();
      rawRows = parseCsv(text).map(normalizeImportRow);
    } else {
      const body = await req.json();
      if (Array.isArray(body)) {
        rawRows = body.map((row) =>
          normalizeImportRow(
            Object.fromEntries(
              Object.entries(row as Record<string, unknown>).map(([k, v]) => [
                k,
                v == null ? "" : String(v),
              ])
            )
          )
        );
      } else if (typeof body?.csv === "string") {
        rawRows = parseCsv(body.csv).map(normalizeImportRow);
      } else {
        return NextResponse.json(
          { error: "Send multipart file or JSON array / { csv: string }" },
          { status: 400 }
        );
      }
    }

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "No rows to import" }, { status: 400 });
    }
    if (rawRows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IMPORT_ROWS} rows per import` },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const results: {
      row: number;
      success: boolean;
      email?: string;
      error?: string;
    }[] = [];

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 2;
      const parsed = contactImportRowSchema.safeParse(rawRows[i]);
      if (!parsed.success) {
        failed++;
        const msg =
          formatValidationDetails(parsed.error.flatten()) || "Validation failed";
        results.push({ row: rowNum, success: false, error: msg });
        continue;
      }

      const input = importRowToContactInput(parsed.data);
      const duplicate = await findDuplicateContact(supabase, workspaceOwnerId!, {
        email: input.email,
        phone: input.phone,
      });

      if (duplicate) {
        skipped++;
        results.push({
          row: rowNum,
          success: false,
          email: input.email,
          error: duplicateContactMessage(duplicate),
        });
        continue;
      }

      const payload = buildContactRecord(input, workspaceOwnerId!);
      const { data, error: dbError } = await supabase
        .from("contacts")
        .insert([payload])
        .select()
        .single();

      if (dbError) {
        failed++;
        results.push({
          row: rowNum,
          success: false,
          email: input.email,
          error: humanizeDbError(contactWriteErrorMessage(dbError)),
        });
        continue;
      }

      created++;
      results.push({
        row: rowNum,
        success: true,
        email: input.email,
      });
      await triggerN8NWebhook("contact.created", data);
    }

    await recordAuditLog({
      workspaceOwnerId: workspaceOwnerId!,
      actorUserId: userId!,
      action: "contact.import",
      entityType: "contact",
      changeSummary: `Imported ${created} contacts (${failed} failed, ${skipped} skipped)`,
      newValues: { created, failed, skipped, total: rawRows.length },
      req,
    });

    return NextResponse.json({
      total: rawRows.length,
      created,
      skipped,
      failed,
      results,
    });
  } catch (err) {
    console.error("POST /api/contacts/import:", err);
    return NextResponse.json(
      { error: "Failed to import contacts" },
      { status: 500 }
    );
  }
}
