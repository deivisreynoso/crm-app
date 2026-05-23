/** Retry Supabase insert without columns that may not exist yet in the DB. */
export async function insertWithColumnFallback<T extends Record<string, unknown>>(
  insertFn: (row: T) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  row: T,
  optionalKeys: (keyof T)[]
) {
  let current = { ...row };
  let result = await insertFn(current);
  let error = result.error;

  while (error) {
    const missing = optionalKeys.find((key) =>
      error!.message.includes(String(key))
    );
    if (!missing) break;
    const { [missing]: _removed, ...rest } = current;
    current = rest as T;
    optionalKeys = optionalKeys.filter((k) => k !== missing);
    result = await insertFn(current);
    error = result.error;
  }

  return result;
}
