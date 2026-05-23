export function insertAtTextareaCursor(
  textarea: HTMLTextAreaElement,
  text: string
): string {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  const next =
    textarea.value.slice(0, start) + text + textarea.value.slice(end);
  const pos = start + text.length;
  requestAnimationFrame(() => {
    textarea.selectionStart = pos;
    textarea.selectionEnd = pos;
    textarea.focus();
  });
  return next;
}
