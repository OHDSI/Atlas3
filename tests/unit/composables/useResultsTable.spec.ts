import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'

import { useResultsTable, type CellValues } from '@/composables/useResultsTable'

interface Row { name: string; pct: CellValues }

// One partition ('overall') and two cohorts (1, 2).
function row(name: string, first?: number, second?: number): Row {
  const cohorts: Record<string, number> = {}
  if (first !== undefined) cohorts['1'] = first
  if (second !== undefined) cohorts['2'] = second
  return { name, pct: { overall: cohorts } }
}

function setup(rows: Row[]) {
  const source = ref(rows)
  return { source, ...useResultsTable<'pct', Row>(() => source.value) }
}

const names = (rows: Row[]) => rows.map(r => r.name)

describe('useResultsTable', () => {
  it('keeps the original order until a column is sorted', () => {
    const { pageRows } = setup([row('b', 1), row('a', 2)])
    expect(names(pageRows.value)).toEqual(['b', 'a'])
  })

  it('sorts descending first and flips on the next toggle', () => {
    const { pageRows, toggleSort, ariaSort } = setup([row('a', 5), row('b', 50), row('c', 10)])
    toggleSort('pct', 'overall', 1)
    expect(names(pageRows.value)).toEqual(['b', 'c', 'a'])
    expect(ariaSort('pct', 'overall', 1)).toBe('descending')

    toggleSort('pct', 'overall', 1)
    expect(names(pageRows.value)).toEqual(['a', 'c', 'b'])
    expect(ariaSort('pct', 'overall', 1)).toBe('ascending')
  })

  it('sorts by the chosen cohort cell and restarts descending on a new cell', () => {
    const { pageRows, toggleSort, ariaSort } = setup([row('x', 1, 9), row('y', 9, 1)])
    toggleSort('pct', 'overall', 1)
    toggleSort('pct', 'overall', 1)
    toggleSort('pct', 'overall', 2)
    expect(names(pageRows.value)).toEqual(['x', 'y'])
    expect(ariaSort('pct', 'overall', 2)).toBe('descending')
    expect(ariaSort('pct', 'overall', 1)).toBe('none')
  })

  it('keeps rows without a value at the bottom in both directions', () => {
    const { pageRows, toggleSort } = setup([row('none'), row('low', 1), row('high', 9)])
    toggleSort('pct', 'overall', 1)
    expect(names(pageRows.value)).toEqual(['high', 'low', 'none'])
    toggleSort('pct', 'overall', 1)
    expect(names(pageRows.value)).toEqual(['low', 'high', 'none'])
  })

  it('pages the sorted rows and clamps the page', async () => {
    const rows = Array.from({ length: 33 }, (_, i) => row(`r${i}`, i))
    const { pageRows, pageCount, setPage, toggleSort } = setup(rows)

    expect(pageCount.value).toBe(3)
    expect(pageRows.value).toHaveLength(15)

    setPage(99)
    expect(names(pageRows.value)).toEqual(['r30', 'r31', 'r32'])

    toggleSort('pct', 'overall', 1)
    await nextTick()
    expect(pageRows.value[0]?.name).toBe('r32')
  })

  it('returns to the first page when sorting, resizing or the rows change', async () => {
    const rows = Array.from({ length: 60 }, (_, i) => row(`r${i}`, i))
    const { source, page, setPage, setPageSize, toggleSort } = setup(rows)

    setPage(2)
    toggleSort('pct', 'overall', 1)
    await nextTick()
    expect(page.value).toBe(1)

    setPage(3)
    setPageSize(25)
    await nextTick()
    expect(page.value).toBe(1)

    setPage(2)
    source.value = rows.slice(0, 30)
    await nextTick()
    expect(page.value).toBe(1)
  })
})
