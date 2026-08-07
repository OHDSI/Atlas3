<!--
  LinkedCohortPicker

  Displays cohorts already linked to the characterization and lets users
  add more from the available cohort list via a dialog.
-->
<template>
  <div class="linked-cohort-picker">
    <div class="linked-cohort-picker__header">
      <h2 class="linked-cohort-picker__title">
        {{ t('cc.viewEdit.results.filters.cohorts', 'Linked Cohorts') }}
      </h2>
      <AtlasButton
        variant="secondary"
        size="sm"
        icon="mdi-plus"
        data-testid="linked-cohort-picker-add"
        @click="openDialog"
      >
        {{ t('common.add', 'Add cohort') }}
      </AtlasButton>
    </div>

    <div
      v-if="modelValue.length === 0"
      class="linked-cohort-picker__empty"
      data-testid="linked-cohort-picker-empty"
    >
      {{ t('common.noData', 'No cohorts linked.') }}
    </div>

    <AtlasList
      v-else
      density="compact"
      class="linked-cohort-picker__list"
      data-testid="linked-cohort-picker-list"
    >
      <AtlasListItem
        v-for="cohort in modelValue"
        :key="cohort.id"
        :data-testid="`linked-cohort-picker-row-${cohort.id}`"
      >
        <template #prepend>
          <AtlasIcon size="small">
            mdi-account-group
          </AtlasIcon>
        </template>
        <v-list-item-title>
          {{ cohort.name }}
        </v-list-item-title>
        <template #append>
          <AtlasIconButton
            icon="mdi-close"
            v-bind="{ ariaLabel: t('columns.remove', 'Remove').value }"
            variant="text"
            size="sm"
            :data-testid="`linked-cohort-picker-remove-${cohort.id}`"
            @click="removeCohort(cohort.id)"
          />
        </template>
      </AtlasListItem>
    </AtlasList>

    <AtlasDialog
      v-model="dialogOpen"
      :eyebrow="tv('common.cohort', 'COHORT')"
      :title="t('ir.editor.chooseACohort', 'Select cohorts to link').value"
      max-width="700"
      @close="dialogOpen = false"
    >
      <div class="linked-cohort-picker__dialog-body">
        <AtlasTextField
          v-model="search"
          :label="t('common.search', 'Search').value"
          prepend-icon="mdi-magnify"
          variant="outlined"
          hide-details
          clearable
          class="mb-3"
          data-testid="linked-cohort-picker-search"
        />
        <AtlasDataTable
          v-model="selectedIds"
          :headers="dialogHeaders"
          :items="selectableItems"
          :search="search"
          item-value="id"
          show-select
          data-testid="linked-cohort-picker-table"
        />
      </div>
      <template #actions>
        <AtlasButton
          variant="ghost"
          data-testid="linked-cohort-picker-cancel"
          @click="dialogOpen = false"
        >
          {{ t('common.cancel', 'Cancel') }}
        </AtlasButton>
        <AtlasButton
          :disabled="selectedIds.length === 0"
          data-testid="linked-cohort-picker-confirm"
          @click="confirmAdd"
        >
          {{ t('common.add', 'Add cohort') }}
        </AtlasButton>
      </template>
    </AtlasDialog>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasDataTable, AtlasDialog, AtlasIcon, AtlasIconButton, AtlasList, AtlasListItem, AtlasTextField } from '@/components/ui'
import { computed, ref } from 'vue'

import { useI18n } from '@/composables/useI18n'
import type { LinkedCohort } from '@/models/characterization.types'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

const props = defineProps<{
  modelValue: LinkedCohort[]
  availableCohorts: CohortDefinitionSummary[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: LinkedCohort[]]
}>()

const { t, tv } = useI18n()

const dialogOpen = ref(false)
const selectedIds = ref<number[]>([])
const search = ref('')

const dialogHeaders = computed(() => [
  { title: t('cc.viewEdit.results.filters.cohorts', 'Linked Cohorts').value, key: 'name' },
])

const selectableItems = computed(() => {
  const linkedIds = new Set(props.modelValue.map(c => c.id))
  return props.availableCohorts
    .filter(c => !linkedIds.has(c.id))
    .map(c => ({ id: c.id, name: c.name }))
})

function openDialog() {
  selectedIds.value = []
  search.value = ''
  dialogOpen.value = true
}

function confirmAdd() {
  const additions: LinkedCohort[] = selectedIds.value
    .map(id => props.availableCohorts.find(c => c.id === id))
    .filter((c): c is CohortDefinitionSummary => Boolean(c))
    .map(c => ({ id: c.id, name: c.name }))

  // De-dupe defensively in case the dialog state and model drifted.
  const existingIds = new Set(props.modelValue.map(c => c.id))
  const merged = [...props.modelValue, ...additions.filter(a => !existingIds.has(a.id))]

  emit('update:modelValue', merged)
  dialogOpen.value = false
}

function removeCohort(id: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter(c => c.id !== id)
  )
}
</script>

<style scoped>
.linked-cohort-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.linked-cohort-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.linked-cohort-picker__title {
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0;
}

.linked-cohort-picker__empty {
  padding: 12px 0;
  color: #666;
  font-style: italic;
}

:global(.v-theme--dark) .linked-cohort-picker__empty {
  color: var(--atlas-color-on-surface-variant);
}

.linked-cohort-picker__list {
  border: 1px solid var(--atlas-color-outline);
  border-radius: 8px;
}

.linked-cohort-picker__dialog-body {
  max-height: 60vh;
  overflow-y: auto;
}
</style>
