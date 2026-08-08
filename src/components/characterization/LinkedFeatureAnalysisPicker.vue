<!--
  LinkedFeatureAnalysisPicker

  Mirrors LinkedCohortPicker for feature analyses. Each linked row also
  shows per-row Annual / Temporal toggles. Until the backing feature
  analysis types expose `supportsAnnual` / `supportsTemporal` flags the
  toggles render disabled with a tooltip.
-->
<template>
  <div class="linked-fa-picker">
    <div class="linked-fa-picker__header">
      <h2 class="linked-fa-picker__title">
        {{ t('cc.viewEdit.design.fa.title', 'Linked Feature Analyses') }}
      </h2>
      <AtlasButton
        variant="secondary"
        size="sm"
        icon="mdi-plus"
        data-testid="linked-fa-picker-add"
        @click="openDialog"
      >
        {{ t('common.add', 'Add feature analysis') }}
      </AtlasButton>
    </div>

    <div
      v-if="modelValue.length === 0"
      class="linked-fa-picker__empty"
      data-testid="linked-fa-picker-empty"
    >
      {{ t('common.noData', 'No feature analyses linked.') }}
    </div>

    <AtlasList
      v-else
      density="compact"
      class="linked-fa-picker__list"
      data-testid="linked-fa-picker-list"
    >
      <AtlasListItem
        v-for="fa in modelValue"
        :key="fa.id"
        :data-testid="`linked-fa-picker-row-${fa.id}`"
      >
        <template #prepend>
          <AtlasIcon size="small">
            mdi-chart-box
          </AtlasIcon>
        </template>
        <v-list-item-title>
          {{ displayName(fa) }}
        </v-list-item-title>
        <v-list-item-subtitle v-if="displaySubtitle(fa)">
          {{ displaySubtitle(fa) }}
        </v-list-item-subtitle>

        <template #append>
          <div class="linked-fa-picker__row-actions">
            <AtlasCheckbox
              v-if="fa.supportsAnnual"
              :model-value="fa.includeAnnual ?? false"
              :label="tv('columns.supportsAnnual', 'Annual')"
              hide-details
              :data-testid="`linked-fa-picker-annual-${fa.id}`"
              @update:model-value="(value) => updateFlag(fa.id, 'includeAnnual', !!value)"
            />
            <AtlasCheckbox
              v-if="fa.supportsTemporal"
              :model-value="fa.includeTemporal ?? false"
              :label="tv('columns.temporal', 'Temporal')"
              hide-details
              :data-testid="`linked-fa-picker-temporal-${fa.id}`"
              @update:model-value="(value) => updateFlag(fa.id, 'includeTemporal', !!value)"
            />
            <AtlasIconButton
              icon="mdi-close"
              v-bind="{ ariaLabel: tv('columns.remove', 'Remove') }"
              variant="text"
              size="sm"
              :data-testid="`linked-fa-picker-remove-${fa.id}`"
              @click="removeFa(fa.id)"
            />
          </div>
        </template>
      </AtlasListItem>
    </AtlasList>

    <AtlasDialog
      v-model="dialogOpen"
      :eyebrow="tv('components.characterizationDesign.detailsEyebrow', 'DETAILS')"
      :title="t('cc.modals.chooseAFeatureAnalyses', 'Select feature analyses to link').value"
      max-width="800"
      @close="dialogOpen = false"
    >
      <div class="linked-fa-picker__dialog-body">
        <AtlasTextField
          v-model="search"
          :label="t('common.search', 'Search').value"
          prepend-icon="mdi-magnify"
          variant="outlined"
          hide-details
          clearable
          class="mb-3"
          data-testid="linked-fa-picker-search"
        />
        <AtlasDataTable
          v-model="selectedIds"
          :headers="dialogHeaders"
          :items="selectableItems"
          :search="search"
          item-value="id"
          show-select
          data-testid="linked-fa-picker-table"
        />
      </div>
      <template #actions>
        <AtlasButton
          variant="ghost"
          data-testid="linked-fa-picker-cancel"
          @click="dialogOpen = false"
        >
          {{ t('common.cancel', 'Cancel') }}
        </AtlasButton>
        <AtlasButton
          :disabled="selectedIds.length === 0"
          data-testid="linked-fa-picker-confirm"
          @click="confirmAdd"
        >
          {{ t('common.add', 'Add feature analysis') }}
        </AtlasButton>
      </template>
    </AtlasDialog>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasCheckbox, AtlasDataTable, AtlasDialog, AtlasIcon, AtlasIconButton, AtlasList, AtlasListItem, AtlasTextField } from '@/components/ui'
import { computed, ref } from 'vue'

import { useI18n } from '@/composables/useI18n'
import type { LinkedFeatureAnalysis } from '@/models/characterization.types'
import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'

const props = defineProps<{
  modelValue: LinkedFeatureAnalysis[]
  availableFeatureAnalyses: FeatureAnalysisListItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: LinkedFeatureAnalysis[]]
}>()

const { t, tv } = useI18n()

const dialogOpen = ref(false)
const selectedIds = ref<number[]>([])
const search = ref('')

const dialogHeaders = computed(() => [
  { title: t('columns.name', 'Name').value, key: 'name' },
  { title: t('cc.fa.analysisType', 'Type').value, key: 'type' },
  {
    title: t('columns.description', 'Description').value,
    key: 'description',
  },
])

const selectableItems = computed(() => {
  const linkedIds = new Set(props.modelValue.map(fa => fa.id))
  return props.availableFeatureAnalyses
    .filter(fa => !linkedIds.has(fa.id))
    .map(fa => ({
      id: fa.id,
      name: fa.name,
      type: fa.type,
      description: fa.description ?? '',
    }))
})

function displayName(fa: LinkedFeatureAnalysis): string {
  if (fa.name && fa.name.length > 0) return fa.name
  const match = props.availableFeatureAnalyses.find(a => a.id === fa.id)
  return match?.name ?? `#${fa.id}`
}

function displaySubtitle(fa: LinkedFeatureAnalysis): string {
  const match = props.availableFeatureAnalyses.find(a => a.id === fa.id)
  const description = fa.description ?? match?.description ?? ''
  const type = match?.type
  if (type && description) return `${type} — ${description}`
  if (type) return type
  return description
}

function openDialog() {
  selectedIds.value = []
  search.value = ''
  dialogOpen.value = true
}

function confirmAdd() {
  const additions: LinkedFeatureAnalysis[] = selectedIds.value
    .map(id => props.availableFeatureAnalyses.find(fa => fa.id === id))
    .filter((fa): fa is FeatureAnalysisListItem => Boolean(fa))
    .map(fa => ({
      id: fa.id,
      name: fa.name,
      description: fa.description,
      statType: fa.statType,
      // `supports*` flags aren't exposed by the FA list endpoint yet — keep
      // them undefined so the toggles render disabled (with the tooltip).
      supportsAnnual: undefined,
      supportsTemporal: undefined,
      includeAnnual: false,
      includeTemporal: false,
    }))

  const existingIds = new Set(props.modelValue.map(fa => fa.id))
  const merged = [...props.modelValue, ...additions.filter(fa => !existingIds.has(fa.id))]

  emit('update:modelValue', merged)
  dialogOpen.value = false
}

function removeFa(id: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter(fa => fa.id !== id)
  )
}

function updateFlag(id: number, flag: 'includeAnnual' | 'includeTemporal', value: boolean) {
  emit(
    'update:modelValue',
    props.modelValue.map(fa => (fa.id === id ? { ...fa, [flag]: value } : fa))
  )
}
</script>

<style scoped>
.linked-fa-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.linked-fa-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.linked-fa-picker__title {
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0;
}

.linked-fa-picker__empty {
  padding: 12px 0;
  color: #666;
  font-style: italic;
}

.v-theme--dark .linked-fa-picker__empty {
  color: var(--atlas-color-on-surface-variant);
}

.linked-fa-picker__list {
  border: 1px solid var(--atlas-color-outline-strong);
  border-radius: 8px;
}

.linked-fa-picker__row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.linked-fa-picker__dialog-body {
  max-height: 60vh;
  overflow-y: auto;
}
</style>
