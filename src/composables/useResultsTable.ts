/**
 * useResultsTable Composable
 * Client-side sort + pagination for characterization result tables. Every
 * sortable column is one data cell, `row[field][partitionKey][cohortId]`,
 * so prevalence (count, pct) and distribution (avg, min, ...) columns
 * share a single rule. State is local, so several tables on one screen
 * page independently.
 */
import { computed, ref, shallowRef, watch } from 'vue'

export type CellValues = Record<string, Record<string, number>>
export type SortDirection = 'ascending' | 'descending'

interface SortState<F extends string> {
  field: F
  partitionKey: string
  cohortId: number
  direction: SortDirection
}

export const DEFAULT_PAGE_SIZE = 15

function cellValue(values: CellValues, partitionKey: string, cohortId: number): number | undefined {
  const value = values[partitionKey]?.[String(cohortId)]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function useResultsTable<F extends string, R extends Record<F, CellValues>>(rows: () => R[]) {
  const sort = shallowRef<SortState<F> | null>(null)
  const page = ref(1)
  const pageSize = ref(DEFAULT_PAGE_SIZE)

  const sortedRows = computed(() => {
    const active = sort.value
    if (!active) return rows()
    const sign = active.direction === 'ascending' ? 1 : -1
    return [...rows()].sort((left, right) => {
      const leftValue = cellValue(left[active.field], active.partitionKey, active.cohortId)
      const rightValue = cellValue(right[active.field], active.partitionKey, active.cohortId)
      // Rows without a value stay at the bottom in either direction.
      if (leftValue === undefined) return rightValue === undefined ? 0 : 1
      if (rightValue === undefined) return -1
      return sign * (leftValue - rightValue)
    })
  })

  const totalItems = computed(() => sortedRows.value.length)
  const pageCount = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)))
  const pageRows = computed(() =>
    sortedRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

  // New rows, a new ordering or a new page size start back on the first page.
  watch([rows, sort, pageSize], () => { page.value = 1 })

  function isActive(field: F, partitionKey: string, cohortId: number): boolean {
    return sort.value?.field === field
      && sort.value.partitionKey === partitionKey
      && sort.value.cohortId === cohortId
  }

  /** A new column sorts descending (most prevalent first); the active column flips. */
  function toggleSort(field: F, partitionKey: string, cohortId: number): void {
    const direction = isActive(field, partitionKey, cohortId) && sort.value!.direction === 'descending'
      ? 'ascending'
      : 'descending'
    sort.value = { field, partitionKey, cohortId, direction }
  }

  function ariaSort(field: F, partitionKey: string, cohortId: number): SortDirection | 'none' {
    return isActive(field, partitionKey, cohortId) ? sort.value!.direction : 'none'
  }

  function setPage(value: number): void {
    page.value = Math.max(1, Math.min(value, pageCount.value))
  }

  function setPageSize(value: number): void {
    pageSize.value = value
  }

  return {
    page,
    pageSize,
    pageCount,
    pageRows,
    totalItems,
    toggleSort,
    ariaSort,
    setPage,
    setPageSize,
  }
}
