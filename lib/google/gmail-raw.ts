export function encodeGmailRaw(raw: string): string {
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function escapeHeaderValue(value: string): string {
  return value.replace(/\r?\n/g, " ").trim();
}
