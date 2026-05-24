/** Detect numbered slot lines like "1) Tuesday..." or "1) ..." from Andrea's replies. */
export type ParsedSlotOption = {
  index: number;
  label: string;
};

const SLOT_LINE = /^\s*(?:\((\d+)\)|(\d+)\))\s+(.+)$/;

export function parseSlotOptions(text: string): ParsedSlotOption[] {
  const options: ParsedSlotOption[] = [];
  for (const line of text.split("\n")) {
    const match = line.match(SLOT_LINE);
    if (!match) continue;
    const index = Number(match[1] ?? match[2]);
    const label = match[3]?.trim();
    if (!index || !label) continue;
    options.push({ index, label });
  }
  return options;
}

export function stripSlotLines(text: string): string {
  const lines = text.split("\n");
  const kept = lines.filter((line) => !SLOT_LINE.test(line));
  return kept.join("\n").trim();
}
