/**
 * Unit tests for the small CSV helper used by the characterization results
 * viewer. Covers RFC 4180 escaping, the columnar getter form, and the
 * browser-download trigger (incl. the no-DOM short-circuit).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { arrayToCsv, downloadCsv } from '@/utils/csv'

describe('arrayToCsv', () => {
  it('renders header + body with the given column order', () => {
    const csv = arrayToCsv(
      [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
      ]
    )
    expect(csv).toBe('ID,Name\r\n1,Alice\r\n2,Bob')
  })

  it('quotes cells containing commas, quotes, or newlines and doubles embedded quotes', () => {
    const csv = arrayToCsv(
      [{ a: 'plain', b: 'has,comma', c: 'has "quote"', d: 'line\nbreak' }],
      [
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B' },
        { key: 'c', label: 'C' },
        { key: 'd', label: 'D' },
      ]
    )
    expect(csv).toContain('plain,"has,comma","has ""quote""","line\nbreak"')
  })

  it('emits empty cells for null and undefined', () => {
    const csv = arrayToCsv(
      [{ a: null, b: undefined, c: 0 }],
      [
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B' },
        { key: 'c', label: 'C' },
      ]
    )
    expect(csv).toBe('A,B,C\r\n,,0')
  })

  it('supports a function-form column getter', () => {
    const csv = arrayToCsv(
      [{ first: 'Ada', last: 'Lovelace' }],
      [{ key: (row) => `${row.first} ${row.last}`, label: 'Full name' }]
    )
    expect(csv).toBe('Full name\r\nAda Lovelace')
  })
})

describe('downloadCsv', () => {
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:mock')
    revokeObjectURL = vi.fn()
    // jsdom's URL doesn't implement createObjectURL; stub the methods.
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a Blob URL, clicks an anchor, then revokes the URL', () => {
    const clickSpy = vi.fn()
    const originalCreate = document.createElement.bind(document)
    const createSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        const el = originalCreate(tag)
        if (tag === 'a') {
          (el as HTMLAnchorElement).click = clickSpy
        }
        return el
      })

    downloadCsv('report.csv', 'a,b\r\n1,2')

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledOnce()
    createSpy.mockRestore()
  })

  it('logs and swallows errors instead of throwing', () => {
    createObjectURL.mockImplementation(() => {
      throw new Error('blob unavailable')
    })
    expect(() => downloadCsv('x.csv', 'a')).not.toThrow()
  })
})
