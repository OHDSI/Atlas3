<template>
  <AtlasDataTable
    :page="page"
    :items-per-page="pageSize"
    :sort-by="sortBy"
    :headers="headers"
    :items="items"
    must-sort
    initial-sort-order="desc"
    class="results-data-table"
    @update:page="emit('update:page', $event)"
    @update:items-per-page="emit('update:pageSize', $event)"
    @update:sort-by="emit('update:sortBy', $event)"
  >
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
    <template #bottom>
      <ResultsTablePagination
        v-if="items.length > pageSize"
        :page="page"
        :page-size="pageSize"
        :total-items="items.length"
        @update:page="emit('update:page', $event)"
        @update:page-size="onPageSizeChange"
      />
    </template>
  </AtlasDataTable>
</template>

<script setup lang="ts">
/**
 * AtlasDataTable in the compact characterization-results style, paged with
 * ResultsTablePagination. Sorting and paging are v-data-table's own; the
 * state is passed in (v-model) so sibling tables (one per cohort or strata) can share
 * it and stay row-aligned.
 */
import { AtlasDataTable } from '@/components/ui'
import ResultsTablePagination from './ResultsTablePagination.vue'

export interface ResultsHeader {
  key: string
  [option: string]: unknown
}

export interface ResultsSortItem {
  key: string
  order?: 'asc' | 'desc'
}

defineProps<{
  headers: ResultsHeader[]
  items: unknown[]
  page: number
  pageSize: number
  sortBy: ResultsSortItem[]
}>()

const emit = defineEmits<{
  'update:page': [page: number]
  'update:pageSize': [pageSize: number]
  'update:sortBy': [sortBy: ResultsSortItem[]]
}>()

function onPageSizeChange(value: number): void {
  emit('update:pageSize', value)
  emit('update:page', 1)
}
</script>

<style scoped>
.results-data-table {
  --v-table-header-height: 28px;
  --v-table-row-height: 24px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.results-data-table :deep(table) { border-collapse: collapse; }
.results-data-table :deep(th),
.results-data-table :deep(td) {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12) !important;
  padding: 2px 4px !important;
  white-space: nowrap;
}
.results-data-table :deep(thead th) {
  background: rgba(var(--v-theme-on-surface), 0.03);
  font-weight: 600;
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
