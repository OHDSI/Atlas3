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
        <v-list-item-subtitle :data-testid="`linked-cohort-picker-id-${cohort.id}`">
          {{ t('columns.id', 'ID').value }} {{ cohort.id }}
        </v-list-item-subtitle>
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

    <CohortPickerDialog
      v-model="dialogOpen"
      :title="t('ir.editor.chooseACohort', 'Select cohorts to link').value"
      :available-cohorts="availableCohorts"
      :excluded-ids="modelValue.map(cohort => cohort.id)"
      @select="confirmAdd"
    />
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasIcon, AtlasIconButton, AtlasList, AtlasListItem } from '@/components/ui'
import { ref } from 'vue'

import { useI18n } from '@/composables/useI18n'
import CohortPickerDialog from '@/components/shared/CohortPickerDialog.vue'
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

function openDialog() {
  dialogOpen.value = true
}

function confirmAdd(additions: LinkedCohort[]) {
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
  color: var(--atlas-color-on-surface-variant);
  font-style: italic;
}

.linked-cohort-picker__list {
  border: 1px solid var(--atlas-color-outline-strong);
  border-radius: 8px;
}

</style>
