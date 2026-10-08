/**
 * useSortedPage Composable
 * Client-side sort + pagination for in-memory result tables. Unlike
 * usePagination it keeps its state local (no URL sync, no scroll), so
 * several tables can page independently on one screen.
 */
import { computed, ref, watch } from 'vue'

export type SortDirection = 'asc' | 'desc'
export type SortValue = string | number | null | undefined

export interface SortState {
  key: string
  direction: SortDirection
}

interface UseSortedPageOptions {
  defaultItemsPerPage?: number
  itemsPerPageOptions?: number[]
}

function isMissing(value: SortValue): boolean {
  return value === null || value === undefined || value === '' ||
    (typeof value === 'number' && !Number.isFinite(value))
}

function compare(a: SortValue, b: SortValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

export function useSortedPage<R>(
  rows: () => R[],
  accessor: (row: R, key: string) => SortValue,
  options: UseSortedPageOptions = {}
) {
  const { defaultItemsPerPage = 25, itemsPerPageOptions = [10, 25, 50, 100] } = options

  const sort = ref<SortState | null>(null)
  const page = ref(1)
  const itemsPerPage = ref(defaultItemsPerPage)

  const sortedRows = computed(() => {
    const list = rows()
    const state = sort.value
    if (!state) return list
    const sign = state.direction === 'asc' ? 1 : -1
    // Decorate once so the accessor runs n times rather than n log n.
    return list
      .map((row, index) => ({ row, index, value: accessor(row, state.key) }))
      .sort((a, b) => {
        const aMissing = isMissing(a.value)
        const bMissing = isMissing(b.value)
        // Rows without a value stay at the bottom in either direction.
        if (aMissing || bMissing) return Number(aMissing) - Number(bMissing) || a.index - b.index
        return sign * compare(a.value, b.value) || a.index - b.index
      })
      .map(entry => entry.row)
  })

  const totalItems = computed(() => sortedRows.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / itemsPerPage.value)))

  const pageRows = computed(() => {
    const start = (page.value - 1) * itemsPerPage.value
    return sortedRows.value.slice(start, start + itemsPerPage.value)
  })

  const rangeStart = computed(() =>
    totalItems.value === 0 ? 0 : (page.value - 1) * itemsPerPage.value + 1)
  const rangeEnd = computed(() => Math.min(page.value * itemsPerPage.value, totalItems.value))

  // A new filter result or ordering starts back on the first page.
  watch([rows, sort, itemsPerPage], () => { page.value = 1 })

  /**
   * Sort by `key`. A new column starts descending when it holds numbers
   * (most prevalent first) and ascending for text; clicking the active
   * column flips the direction.
   */
  function toggleSort(key: string, numeric = false) {
    if (sort.value?.key === key) {
      sort.value = { key, direction: sort.value.direction === 'asc' ? 'desc' : 'asc' }
    } else {
      sort.value = { key, direction: numeric ? 'desc' : 'asc' }
    }
  }

  function sortDirection(key: string): SortDirection | null {
    return sort.value?.key === key ? sort.value.direction : null
  }

  function ariaSort(key: string): 'ascending' | 'descending' | 'none' {
    const direction = sortDirection(key)
    if (!direction) return 'none'
    return direction === 'asc' ? 'ascending' : 'descending'
  }

  function setPage(value: number) {
    page.value = Math.max(1, Math.min(value, totalPages.value))
  }

  function setItemsPerPage(value: number) {
    itemsPerPage.value = value
  }

  return {
    sort,
    page,
    itemsPerPage,
    itemsPerPageOptions,
    sortedRows,
    pageRows,
    totalItems,
    totalPages,
    rangeStart,
    rangeEnd,
    toggleSort,
    sortDirection,
    ariaSort,
    setPage,
    setItemsPerPage,
  }
}
