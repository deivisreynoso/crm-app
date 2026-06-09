import { logDroppedOptionalColumn } from "@/lib/api/column-fallback";

function isMissingColumnError(message: string) {
  return /column|does not exist|schema cache/i.test(message);
}

/** Retry Supabase select dropping trailing optional columns when DB is behind migrations. */
export async function selectWithColumnFallback<T extends Record<string, unknown>>(
  runQuery: (select: string) => Promise<{ data: T[] | null; error: { message: string } | null }>,
  selectVariants: string[]
): Promise<{ data: T[] | null; error: { message: string } | null }> {
  for (let i = 0; i < selectVariants.length; i++) {
    const select = selectVariants[i]!;
    const result = await runQuery(select);
    if (!result.error) return result;

    const hasFallback = i < selectVariants.length - 1;
    if (!hasFallback || !isMissingColumnError(result.error.message)) {
      return result;
    }

    logDroppedOptionalColumn("select", select);
  }

  return { data: null, error: { message: "selectWithColumnFallback exhausted" } };
}
