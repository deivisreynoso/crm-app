/** Stable notes value linking a payment row to a quote document (no document_id column on payments). */
export function quotePaymentNotes(documentId: string): string {
  return `Quote payment (${documentId})`;
}
