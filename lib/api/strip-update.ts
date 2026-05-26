import { logDroppedOptionalColumn } from "@/lib/api/column-fallback";

/** Retry Supabase update without columns that may not exist yet in the DB. */
export async function updateWithColumnFallback<T extends Record<string, unknown>>(
  updateFn: (row: T) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  row: T,
  optionalKeys: (keyof T)[]
) {
  let current = { ...row };
  let result = await updateFn(current);
  let error = result.error;

  while (error) {
    const missing = optionalKeys.find((key) =>
      error!.message.includes(String(key))
    );
    if (!missing) break;
    logDroppedOptionalColumn("update", String(missing));
    const { [missing]: _removed, ...rest } = current;
    current = rest as T;
    optionalKeys = optionalKeys.filter((k) => k !== missing);
    result = await updateFn(current);
    error = result.error;
  }

  return result;
}
