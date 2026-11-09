/**
 * CSV utilities
 *
 * Tiny helpers used by report viewers to dump a tabular structure to CSV
 * text and trigger a browser download via the standard
 * `URL.createObjectURL` + `<a download>` pattern.
 */
import { logger } from '@/utils/logger'

export interface CsvColumn<T> {
  /** Property key on the row, or a custom getter for derived values. */
  key: keyof T | ((row: T) => unknown)
  /** Header label written to the first row of the CSV. */
  label: string
}

/**
 * Matches a cell that a spreadsheet would interpret as a formula (CSV / formula
 * injection, CWE-1236): text starting with `=`, `+`, `-`, `@`, tab or CR.
 * Plain numbers such as `-1.5` or `+3e2` (and a lone `-` placeholder) are
 * excluded so numeric columns are left untouched. Also usable as papaparse's
 * `escapeFormulae` option.
 */
export const CSV_FORMULA_PATTERN = /^(?!-$)(?![-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$)[=+\-@\t\r]/

/**
 * Prefix a cell value that would be evaluated as a spreadsheet formula with a
 * single quote, so user-authored text (cohort names, concept set names, rule
 * names) exported to CSV opens as text in Excel / LibreOffice / Sheets.
 */
export function neutralizeCsvFormula(str: string): string {
  return CSV_FORMULA_PATTERN.test(str) ? `'${str}` : str
}

/**
 * Escape a single CSV cell value per RFC 4180:
 * wrap in quotes if it contains a quote, comma, or newline; double up
 * embedded quotes. Formula-like text is neutralized first.
 */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  const str = neutralizeCsvFormula(typeof value === 'string' ? value : String(value))
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Convert an array of rows to CSV text.
 *
 * @param rows Source rows.
 * @param columns Column descriptors. The order is preserved.
 */
export function arrayToCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map(c => escapeCell(c.label)).join(',')
  const body = rows.map(row =>
    columns
      .map(c => {
        const value =
          typeof c.key === 'function'
            ? c.key(row)
            : (row as Record<string, unknown>)[c.key as string]
        return escapeCell(value)
      })
      .join(',')
  )
  return [header, ...body].join('\r\n')
}

/**
 * Trigger a browser download for the given CSV text.
 * No-op outside the browser (e.g. SSR, tests without a DOM).
 */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    logger.debug('Csv', 'downloadCsv called outside a browser; skipping')
    return
  }
  try {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    logger.error('Csv', 'Failed to trigger CSV download', error)
  }
}
