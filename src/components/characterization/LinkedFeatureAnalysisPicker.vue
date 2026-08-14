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
        <!-- Same filtering the concept list offers, and the same facets Atlas
             2.15 puts on this dialog: a library of a thousand-odd analyses is
             not searchable by name alone (#216). -->
        <AtlasFacetFilterBar
          :facet-options="facetOptions"
          :selected="selected"
          :active-filter-count="activeFilterCount"
          :facets="facets"
          :result-filter="textFilter"
          class="mb-3"
          text-field-test-id="linked-fa-picker-search"
          @update:facet="({ key, values }) => setFacet(key, values)"
          @update:result-filter="setTextFilter"
          @clear="clearFilters"
        />
        <AtlasDataTable
          v-model="selectedIds"
          :headers="dialogHeaders"
          :items="selectableItems"
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
import { AtlasButton, AtlasCheckbox, AtlasDataTable, AtlasDialog, AtlasFacetFilterBar, AtlasIcon, AtlasIconButton, AtlasList, AtlasListItem } from '@/components/ui'
import { computed, ref } from 'vue'

import { useI18n } from '@/composables/useI18n'
import { useConceptFacets } from '@/composables/useConceptFacets'
import {
  featureAnalysisFacets,
  featureAnalysisSearchText,
} from '@/composables/useFeatureAnalysisFacets'
import type { LinkedFeatureAnalysis } from '@/models/characterization.types'
import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'

const props = defineProps<{
  modelValue: LinkedFeatureAnalysis[]
  availableFeatureAnalyses: FeatureAnalysisListItem[]
  /**
   * Login of the signed-in user, for the My designs / Other designs facet.
   * A prop rather than a store read so this stays a presentational component:
   * reaching for Pinia here would make every consumer's test install it just to
   * render a list.
   */
  currentUserLogin?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: LinkedFeatureAnalysis[]]
}>()

const { t, tv } = useI18n()

const dialogOpen = ref(false)
const selectedIds = ref<number[]>([])

// The analyses this dialog can offer: everything not already linked.
const unlinkedAnalyses = computed(() => {
  const linkedIds = new Set(props.modelValue.map(fa => fa.id))
  return props.availableFeatureAnalyses.filter(fa => !linkedIds.has(fa.id))
})

// `now` is captured when the dialog opens rather than read per render, so a row
// cannot drift between the Created/Updated buckets while the dialog is open.
const facetNow = ref(0)

const facets = computed(() =>
  featureAnalysisFacets({ currentUserLogin: props.currentUserLogin, now: facetNow.value })
)

const {
  selected,
  textFilter,
  facetOptions,
  filteredConcepts: filteredAnalyses,
  activeFilterCount,
  setFacet,
  setTextFilter,
  clearFilters,
} = useConceptFacets(unlinkedAnalyses, facets, featureAnalysisSearchText)

const dialogHeaders = computed(() => [
  { title: t('columns.name', 'Name').value, key: 'name' },
  { title: t('cc.fa.analysisType', 'Type').value, key: 'type' },
  {
    title: t('columns.description', 'Description').value,
    key: 'description',
  },
])

const selectableItems = computed(() =>
  filteredAnalyses.value.map(fa => ({
    id: fa.id,
    name: fa.name,
    type: fa.type,
    description: fa.description ?? '',
  }))
)

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
  clearFilters()
  facetNow.value = Date.now()
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
  color: var(--atlas-color-on-surface-variant);
  font-style: italic;
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
