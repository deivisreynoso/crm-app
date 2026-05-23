export function parseTagsInput(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function formatTagsForInput(tags?: string[]): string {
  return tags?.join(", ") ?? "";
}
