export function verifyN8NWebhookSecret(
  headerSecret: string | null,
  expected = process.env.N8N_WEBHOOK_SECRET?.trim()
): boolean {
  if (!expected) return false;
  return Boolean(headerSecret && headerSecret === expected);
}
