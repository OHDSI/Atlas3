<template>
  <div
    class="results-table-pagination"
    data-testid="char-results-pagination"
  >
    <div class="results-table-pagination__per-page">
      <span class="results-table-pagination__label">Rows per page</span>
      <AtlasSelect
        :model-value="pageSize"
        :items="pageSizeOptions"
        variant="outlined"
        hide-details
        class="results-table-pagination__select"
        aria-label="Rows per page"
        @update:model-value="$emit('update:page-size', Number($event))"
      />
    </div>
    <span
      class="results-table-pagination__range"
      role="status"
      aria-live="polite"
    >
      {{ start }}-{{ end }} of {{ totalItems }}
    </span>
    <AtlasPagination
      :model-value="page"
      :length="pageCount"
      :total-visible="5"
      @update:model-value="$emit('update:page', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasPagination, AtlasSelect } from '@/components/ui'

const props = defineProps<{
  page: number
  pageSize: number
  totalItems: number
}>()

defineEmits<{
  'update:page': [page: number]
  'update:page-size': [pageSize: number]
}>()

const pageCount = computed(() => Math.max(1, Math.ceil(props.totalItems / props.pageSize)))
const start = computed(() => (props.page - 1) * props.pageSize + 1)
const end = computed(() => Math.min(props.page * props.pageSize, props.totalItems))
const pageSizeOptions = [15, 25, 50, 100]
</script>

<style scoped>
.results-table-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px 20px;
}
.results-table-pagination__range {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.results-table-pagination__per-page {
  display: flex;
  align-items: center;
  gap: 8px;
}
.results-table-pagination__label {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 12px;
  white-space: nowrap;
}
.results-table-pagination__select {
  width: 84px;
}
</style>