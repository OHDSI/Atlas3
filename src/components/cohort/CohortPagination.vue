<template>
  <div class="cohort-pagination">
    <!-- Items per page on the left, range readout, then v-pagination
         on the right. Replaces the previous hand-rolled prev / next
         pair so we get keyboard nav, page numbers, and ellipses. -->
    <div class="cohort-pagination__per-page">
      <span class="cohort-pagination__label">{{
        t('datatable.itemsPerPage', 'Rows per page:').value
      }}</span>
      <v-select
        :model-value="itemsPerPage"
        :items="itemsPerPageOptions"
        density="compact"
        variant="outlined"
        hide-details
        class="cohort-pagination__select"
        :aria-label="t('common.selectItemsPerPage', 'Select number of items per page').value"
        @update:model-value="$emit('update:items-per-page', $event)"
      />
    </div>

    <div
      class="cohort-pagination__range"
      role="status"
      aria-live="polite"
    >
      {{ rangeDisplay }}
    </div>

    <AtlasPagination
      v-if="totalPages > 1"
      :model-value="page"
      :length="totalPages"
      :total-visible="5"
      density="comfortable"
      class="cohort-pagination__pages"
      @update:model-value="$emit('update:page', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { AtlasPagination } from '@/components/ui'
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

interface Props {
  page: number
  itemsPerPage: number
  itemsPerPageOptions: number[]
  totalItems: number
  rangeDisplay: string
}

interface Emits {
  (e: 'update:page', value: number): void
  (e: 'update:items-per-page', value: number): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.itemsPerPage)))
</script>

<style scoped>
.cohort-pagination {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  justify-content: space-between;
  width: 100%;
}

.cohort-pagination__per-page {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cohort-pagination__label {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
  white-space: nowrap;
}

.cohort-pagination__select {
  width: 92px;
}

.cohort-pagination__range {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.cohort-pagination__pages {
  flex-shrink: 0;
}

@media (max-width: 599px) {
  .cohort-pagination {
    justify-content: center;
  }
}
</style>
