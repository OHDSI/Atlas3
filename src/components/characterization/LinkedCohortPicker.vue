<!--
  LinkedCohortPicker

  Displays cohorts already linked to the characterization and lets users
  add more from the available cohort list via a dialog.
-->
<template>
  <div class="linked-cohort-picker">
    <div class="linked-cohort-picker__header">
      <h2 class="linked-cohort-picker__title">
        {{ t('characterizations.editor.cohorts.title', 'Linked Cohorts') }}
      </h2>
      <v-btn
        variant="outlined"
        color="primary"
        prepend-icon="mdi-plus"
        size="small"
        data-testid="linked-cohort-picker-add"
        @click="openDialog"
      >
        {{ t('characterizations.editor.cohorts.add', 'Add cohort') }}
      </v-btn>
    </div>

    <div
      v-if="modelValue.length === 0"
      class="linked-cohort-picker__empty"
      data-testid="linked-cohort-picker-empty"
    >
      {{ t('characterizations.editor.cohorts.empty', 'No cohorts linked.') }}
    </div>

    <v-list
      v-else
      density="comfortable"
      class="linked-cohort-picker__list"
      data-testid="linked-cohort-picker-list"
    >
      <v-list-item
        v-for="cohort in modelValue"
        :key="cohort.id"
        :data-testid="`linked-cohort-picker-row-${cohort.id}`"
      >
        <template #prepend>
          <v-icon size="small">
            mdi-account-group
          </v-icon>
        </template>
        <v-list-item-title>{{ cohort.name }}</v-list-item-title>
        <template #append>
          <v-btn
            icon="mdi-close"
            size="x-small"
            variant="text"
            :aria-label="t('characterizations.editor.cohorts.remove', 'Remove').value"
            :data-testid="`linked-cohort-picker-remove-${cohort.id}`"
            @click="removeCohort(cohort.id)"
          />
        </template>
      </v-list-item>
    </v-list>

    <v-dialog
      v-model="dialogOpen"
      max-width="700"
    >
      <v-card>
        <v-card-title>
          {{ t('characterizations.editor.cohorts.selectDialogTitle', 'Select cohorts to link') }}
        </v-card-title>
        <v-card-text class="linked-cohort-picker__dialog-body">
          <v-data-table
            v-model="selectedIds"
            :headers="dialogHeaders"
            :items="selectableItems"
            item-value="id"
            show-select
            density="comfortable"
            data-testid="linked-cohort-picker-table"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            data-testid="linked-cohort-picker-cancel"
            @click="dialogOpen = false"
          >
            {{ t('common.cancel', 'Cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :disabled="selectedIds.length === 0"
            data-testid="linked-cohort-picker-confirm"
            @click="confirmAdd"
          >
            {{ t('characterizations.editor.cohorts.add', 'Add cohort') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
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

const { t } = useI18n()

const dialogOpen = ref(false)
const selectedIds = ref<number[]>([])

const dialogHeaders = computed(() => [
  { title: t('characterizations.editor.cohorts.title', 'Linked Cohorts').value, key: 'name' },
])

const selectableItems = computed(() => {
  const linkedIds = new Set(props.modelValue.map((c) => c.id))
  return props.availableCohorts
    .filter((c) => !linkedIds.has(c.id))
    .map((c) => ({ id: c.id, name: c.name }))
})

function openDialog() {
  selectedIds.value = []
  dialogOpen.value = true
}

function confirmAdd() {
  const additions: LinkedCohort[] = selectedIds.value
    .map((id) => props.availableCohorts.find((c) => c.id === id))
    .filter((c): c is CohortDefinitionSummary => Boolean(c))
    .map((c) => ({ id: c.id, name: c.name }))

  // De-dupe defensively in case the dialog state and model drifted.
  const existingIds = new Set(props.modelValue.map((c) => c.id))
  const merged = [...props.modelValue, ...additions.filter((a) => !existingIds.has(a.id))]

  emit('update:modelValue', merged)
  dialogOpen.value = false
}

function removeCohort(id: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter((c) => c.id !== id)
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

.linked-cohort-picker__list {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
}

.linked-cohort-picker__dialog-body {
  max-height: 60vh;
  overflow-y: auto;
}
</style>
