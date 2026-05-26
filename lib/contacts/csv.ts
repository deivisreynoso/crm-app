/** CSV helpers for contact import/export. */

export const CONTACT_CSV_HEADERS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "company",
  "title",
  "source",
  "status",
  "notes",
  "platform",
  "friction_area",
  "communication_channels",
  "signals",
  "ai_summary",
  "tags",
  "city",
  "state",
  "country",
  "postal_code",
  "website",
] as const;

export type ContactCsvHeader = (typeof CONTACT_CSV_HEADERS)[number];

export function escapeCsvCell(value: string): string {
  const v = value ?? "";
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export function rowToCsvLine(values: string[]): string {
  return values.map(escapeCsvCell).join(",");
}

export function contactsToCsv(
  rows: Record<string, unknown>[]
): string {
  const header = CONTACT_CSV_HEADERS.join(",");
  const lines = rows.map((row) =>
    rowToCsvLine(
      CONTACT_CSV_HEADERS.map((h) => {
        const raw = row[h];
        if (raw == null) return "";
        if (h === "tags" && Array.isArray(raw)) {
          return raw.join(", ");
        }
        return String(raw);
      })
    )
  );
  return [header, ...lines].join("\r\n");
}

/** Parse CSV text into rows of header → string value. */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = splitCsvLines(text.trim());
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return rows;
}

function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++;
      lines.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.length > 0) lines.push(current);
  return lines;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  cells.push(current);
  return cells;
}

export function normalizeImportRow(
  raw: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const k = key.trim().toLowerCase().replace(/\s+/g, "_");
    out[k] = value;
  }
  return out;
}
