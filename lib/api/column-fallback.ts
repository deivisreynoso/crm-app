/** Log when a DB column is dropped due to schema drift (optional migration columns). */
export function logDroppedOptionalColumn(
  operation: "insert" | "update",
  column: string
) {
  console.warn(
    `[schema-fallback] ${operation} omitted missing column "${column}". Run pending Supabase migrations.`
  );
}
