import DOMPurify from 'dompurify'

/** Escape text for interpolation into an HTML string, e.g. an ECharts tooltip. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Sanitize an HTML fragment before it is bound with `v-html`.
 *
 * Server-rendered HTML such as WebAPI's cohort print-friendly output embeds
 * user-authored text (cohort / concept set names, descriptions) and is not
 * guaranteed to be escaped, so it must not be trusted as markup. Scripts,
 * event handlers, `javascript:` URLs and similar are stripped; ordinary
 * formatting (headings, lists, tables, links) is kept.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}
