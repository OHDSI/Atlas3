<template>
  <AtlasDialog
    :model-value="modelValue"
    :eyebrow="t('common.cohort', 'Cohort').value"
    :title="title"
    max-width="1000"
    @update:model-value="emit('update:modelValue', $event)"
    @close="close"
  >
    <div class="cohort-picker-dialog__body">
      <CohortFilters
        :filters="filters"
        :available-tags="availableTags"
        :available-authors="availableAuthors"
        :active-filter-count="activeFilterCount"
        @update:filters="filters = $event"
        @clear="clearFilters"
      />

      <AtlasDataTable
        v-model="selectedIds"
        :headers="headers"
        :items="paginatedCohorts"
        :loading="loading || filtering"
        item-value="id"
        show-select
        hide-default-footer
        data-testid="cohort-picker-dialog-table"
      >
        <template #[`header.data-table-select`] />
      </AtlasDataTable>

      <CohortPagination
        v-if="selectableCohorts.length"
        :page="page"
        :items-per-page="itemsPerPage"
        :items-per-page-options="itemsPerPageOptions"
        :total-items="selectableCohorts.length"
        :range-display="rangeDisplay"
        class="cohort-picker-dialog__pagination"
        @update:page="page = $event"
        @update:items-per-page="setItemsPerPage"
      />
    </div>

    <template #actions>
      <AtlasButton
        variant="ghost"
        data-testid="cohort-picker-dialog-cancel"
        @click="close"
      >
        {{ t('common.cancel', 'Cancel') }}
      </AtlasButton>
      <AtlasButton
        :disabled="selectedIds.length === 0"
        data-testid="cohort-picker-dialog-confirm"
        @click="confirm"
      >
        {{ confirmLabel }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AtlasButton, AtlasDataTable, AtlasDialog } from '@/components/ui'
import CohortFilters from '@/components/cohort/CohortFilters.vue'
import CohortPagination from '@/components/cohort/CohortPagination.vue'
import { useCohorts } from '@/composables/useCohorts'
import { useI18n } from '@/composables/useI18n'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

interface CohortReference {
  id: number
  name: string
  [key: string]: unknown
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  availableCohorts?: CohortDefinitionSummary[]
  excludedIds?: number[]
  title?: string
  confirmLabel?: string
}>(), {
  availableCohorts: undefined,
  excludedIds: () => [],
  title: undefined,
  confirmLabel: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  select: [cohorts: CohortReference[]]
}>()

const { t } = useI18n()
const {
  cohorts,
  loading,
  filtering,
  filters,
  filteredCohorts,
  availableTags,
  availableAuthors,
  activeFilterCount,
  fetchCohorts,
  clearFilters,
} = useCohorts()

const selectedIds = ref<number[]>([])
const page = ref(1)
const itemsPerPage = ref(10)
const itemsPerPageOptions = [10, 25, 50]

const title = computed(() => props.title ?? t('components.incidenceRate.selectCohorts', 'Select cohorts').value)
const confirmLabel = computed(() => props.confirmLabel ?? t('common.add', 'Add cohort').value)
const headers = computed(() => [
  { title: t('columns.id', 'ID').value, key: 'id', width: '96px' },
  { title: t('columns.name', 'Name').value, key: 'name' },
])

const selectableCohorts = computed(() => {
  const excluded = new Set(props.excludedIds)
  return filteredCohorts.value.filter(cohort => !excluded.has(cohort.id))
})
const paginatedCohorts = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  return selectableCohorts.value.slice(start, start + itemsPerPage.value)
})
const rangeDisplay = computed(() => {
  const total = selectableCohorts.value.length
  if (!total) return '0-0 of 0'
  const start = (page.value - 1) * itemsPerPage.value + 1
  const end = Math.min(page.value * itemsPerPage.value, total)
  return `${start}-${end} of ${total}`
})

watch(selectableCohorts, () => {
  const totalPages = Math.max(1, Math.ceil(selectableCohorts.value.length / itemsPerPage.value))
  if (page.value > totalPages) page.value = 1
})

watch(
  () => props.availableCohorts,
  availableCohorts => {
    if (availableCohorts !== undefined) cohorts.value = availableCohorts
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  async open => {
    if (!open) return
    selectedIds.value = []
    page.value = 1
    if (props.availableCohorts === undefined && cohorts.value.length === 0 && !loading.value) {
      await fetchCohorts()
    }
  },
  { immediate: true }
)

function setItemsPerPage(value: number) {
  itemsPerPage.value = value
  page.value = 1
}

function close() {
  emit('update:modelValue', false)
  selectedIds.value = []
}

function confirm() {
  const selected = new Set(selectedIds.value)
  emit(
    'select',
    cohorts.value
      .filter(cohort => selected.has(cohort.id))
      .map(cohort => ({ id: cohort.id, name: cohort.name }))
  )
  close()
}
</script>

<style scoped>
.cohort-picker-dialog__body {
  display: grid;
  gap: 16px;
  min-height: 0;
}
.cohort-picker-dialog__pagination { margin-top: 2px; }
</style>