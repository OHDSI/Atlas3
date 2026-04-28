<template>
  <div class="cohort-pagination">
    <div class="cohort-pagination__controls">
      <!-- Items per page selector -->
      <div class="cohort-pagination__per-page">
        <span class="cohort-pagination__label">{{ t('datatable.language.lengthMenu', 'Items per page:') }}</span>
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

      <!-- Range display -->
      <div
        class="cohort-pagination__range"
        role="status"
        aria-live="polite"
      >
        {{ rangeDisplay }}
      </div>

      <!-- Navigation buttons -->
      <div class="cohort-pagination__nav">
        <v-btn
          icon="mdi-chevron-left"
          size="small"
          variant="text"
          :disabled="!canGoPrevious"
          :aria-label="t('datatable.language.paginate.previous', 'Previous page').value"
          @click="$emit('previous')"
        />
        <v-btn
          icon="mdi-chevron-right"
          size="small"
          variant="text"
          :disabled="!canGoNext"
          :aria-label="t('datatable.language.paginate.next', 'Next page').value"
          @click="$emit('next')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
interface Props {
  page: number
  itemsPerPage: number
  itemsPerPageOptions: number[]
  totalItems: number
  canGoPrevious: boolean
  canGoNext: boolean
  rangeDisplay: string
}

interface Emits {
  (e: 'previous'): void
  (e: 'next'): void
  (e: 'update:items-per-page', value: number): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
.cohort-pagination {
  display: flex;
  justify-content: center;
  padding: 0;
  margin: 0;
}

.cohort-pagination__controls {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  justify-content: center;
}

.cohort-pagination__per-page {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cohort-pagination__label {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  white-space: nowrap;
}

.cohort-pagination__select {
  width: 100px;
}

.cohort-pagination__range {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.87);
  font-weight: 500;
  white-space: nowrap;
}

.cohort-pagination__nav {
  display: flex;
  gap: 8px;
}

/* Responsive adjustments */
@media (max-width: 599px) {
  .cohort-pagination__controls {
    flex-direction: column;
    gap: 16px;
  }

  .cohort-pagination__per-page {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
