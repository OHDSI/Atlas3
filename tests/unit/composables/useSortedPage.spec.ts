import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'

import { useSortedPage } from '@/composables/useSortedPage'

interface Row { name: string; pct?: number }

function setup(rows: Row[], options?: Parameters<typeof useSortedPage>[2]) {
  const source = ref(rows)
  const table = useSortedPage(
    () => source.value,
    (row: Row, key) => (key === 'name' ? row.name : row.pct),
    options
  )
  return { source, ...table }
}

describe('useSortedPage', () => {
  it('keeps the original order until a column is sorted', () => {
    const { pageRows } = setup([{ name: 'b', pct: 1 }, { name: 'a', pct: 2 }])
    expect(pageRows.value.map(r => r.name)).toEqual(['b', 'a'])
  })

  it('sorts numeric columns descending first and flips on the next toggle', () => {
    const { pageRows, toggleSort, ariaSort } = setup([
      { name: 'a', pct: 5 }, { name: 'b', pct: 50 }, { name: 'c', pct: 10 },
    ])
    toggleSort('pct', true)
    expect(pageRows.value.map(r => r.name)).toEqual(['b', 'c', 'a'])
    expect(ariaSort('pct')).toBe('descending')

    toggleSort('pct', true)
    expect(pageRows.value.map(r => r.name)).toEqual(['a', 'c', 'b'])
    expect(ariaSort('pct')).toBe('ascending')
    expect(ariaSort('name')).toBe('none')
  })

  it('sorts text columns ascending first', () => {
    const { pageRows, toggleSort } = setup([{ name: 'item 10' }, { name: 'Item 2' }, { name: 'item 1' }])
    toggleSort('name')
    expect(pageRows.value.map(r => r.name)).toEqual(['item 1', 'Item 2', 'item 10'])
  })

  it('keeps rows without a value at the bottom in both directions', () => {
    const { pageRows, toggleSort } = setup([
      { name: 'none' }, { name: 'low', pct: 1 }, { name: 'high', pct: 9 },
    ])
    toggleSort('pct', true)
    expect(pageRows.value.map(r => r.name)).toEqual(['high', 'low', 'none'])
    toggleSort('pct', true)
    expect(pageRows.value.map(r => r.name)).toEqual(['low', 'high', 'none'])
  })

  it('pages the sorted rows and reports the visible range', async () => {
    const rows = Array.from({ length: 23 }, (_, i) => ({ name: `r${i}`, pct: i }))
    const { pageRows, setPage, totalPages, rangeStart, rangeEnd, toggleSort } =
      setup(rows, { defaultItemsPerPage: 10 })

    expect(totalPages.value).toBe(3)
    expect(pageRows.value).toHaveLength(10)

    setPage(3)
    expect(pageRows.value.map(r => r.name)).toEqual(['r20', 'r21', 'r22'])
    expect([rangeStart.value, rangeEnd.value]).toEqual([21, 23])

    setPage(99)
    expect(rangeEnd.value).toBe(23)

    toggleSort('pct', true)
    await nextTick()
    expect(pageRows.value[0]?.name).toBe('r22')
  })

  it('returns to the first page when sorting, resizing or the rows change', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({ name: `r${i}`, pct: i }))
    const { source, page, setPage, toggleSort, setItemsPerPage } = setup(rows, { defaultItemsPerPage: 10 })

    setPage(2)
    toggleSort('pct', true)
    await nextTick()
    expect(page.value).toBe(1)

    setPage(3)
    setItemsPerPage(25)
    await nextTick()
    expect(page.value).toBe(1)

    setPage(2)
    source.value = rows.slice(0, 15)
    await nextTick()
    expect(page.value).toBe(1)
  })
})
