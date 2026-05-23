import { COUNTRIES } from "@/lib/constants/countries";

export function parsePhoneParts(phone?: string | null): {
  dialCode: string;
  number: string;
} {
  const raw = phone?.trim() ?? "";
  if (!raw) return { dialCode: "+1", number: "" };

  const sorted = [...COUNTRIES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );

  for (const country of sorted) {
    if (raw.startsWith(country.dialCode)) {
      return {
        dialCode: country.dialCode,
        number: raw.slice(country.dialCode.length).replace(/^\s+/, ""),
      };
    }
  }

  if (raw.startsWith("+")) {
    const match = raw.match(/^(\+\d{1,3})\s*(.*)$/);
    if (match) {
      return { dialCode: match[1], number: match[2] };
    }
  }

  return { dialCode: "+1", number: raw };
}

export function formatPhone(dialCode: string, number: string): string {
  const digits = number.replace(/\D/g, "");
  if (!digits) return "";
  return `${dialCode} ${digits}`.trim();
}
