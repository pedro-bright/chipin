/**
 * Escape HTML special characters to prevent XSS in email templates.
 * This is critical since email HTML templates use string interpolation
 * rather than React's auto-escaping.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
