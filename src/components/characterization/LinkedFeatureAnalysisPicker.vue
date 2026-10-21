<!--
  LinkedFeatureAnalysisPicker

  Mirrors LinkedCohortPicker for feature analyses, plus the design-level
  "Include Annual / Temporal Distribution" options.

  WebAPI has no design-level field for those options: they are stored as
  includeAnnual / includeTemporal on every linked analysis row, and generation
  enables the annual / temporal pass when ANY row has the flag (for every
  supporting preset analysis). So, as in Atlas 2.x, each checkbox reflects
  "any row has it" and toggling writes the value to every row, supported or
  not, so toggling off reliably clears it.
-->
<template>
  <div class="linked-fa-picker">
    <div class="linked-fa-picker__header">
      <h2 class="linked-fa-picker__title">
        {{ t('cc.viewEdit.design.fa.title') }}
      </h2>
      <AtlasButton
        variant="secondary"
        size="sm"
        icon="mdi-plus"
        data-testid="linked-fa-picker-add"
        @click="openDialog"
      >
        {{ t('common.addFeatureAnalysis') }}
      </AtlasButton>
    </div>

    <div
      v-if="modelValue.length === 0"
      class="linked-fa-picker__empty"
      data-testid="linked-fa-picker-empty"
    >
      {{ t('cc.viewEdit.featureAnalyses.emptyLinked') }}
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
          <span
            v-for="flag in supportedFlags(fa)"
            :key="flag"
            class="linked-fa-picker__capability"
            role="img"
            :aria-label="tv(CAPABILITY[flag].supportsKey)"
            :data-testid="`linked-fa-picker-${CAPABILITY[flag].testId}-${fa.id}`"
          >
            <AtlasIcon
              size="small"
              aria-hidden="true"
            >
              {{ CAPABILITY[flag].icon }}
            </AtlasIcon>
            <AtlasTooltip
              activator="parent"
              location="top"
              :text="tv(CAPABILITY[flag].supportsKey)"
            />
          </span>
          <AtlasIconButton
            icon="mdi-close"
            v-bind="{ ariaLabel: tv('columns.remove') }"
            variant="text"
            size="sm"
            :data-testid="`linked-fa-picker-remove-${fa.id}`"
            @click="removeFa(fa.id)"
          />
        </template>
      </AtlasListItem>
    </AtlasList>

    <div
      class="linked-fa-picker__design-options"
      data-testid="linked-fa-picker-design-options"
    >
      <AtlasCheckbox
        :model-value="includeAnnual"
        :label="tv('cc.viewEdit.design.fa.includeAnnual')"
        :disabled="modelValue.length === 0"
        hide-details
        data-testid="linked-fa-picker-include-annual"
        @update:model-value="(value) => setDesignFlag('includeAnnual', !!value)"
      >
        <template #label>
          <AtlasIcon
            size="small"
            class="linked-fa-picker__label-icon"
            aria-hidden="true"
          >
            {{ CAPABILITY.includeAnnual.icon }}
          </AtlasIcon>
          {{ tv('cc.viewEdit.design.fa.includeAnnual') }}
        </template>
      </AtlasCheckbox>
      <AtlasCheckbox
        :model-value="includeTemporal"
        :label="tv('cc.viewEdit.design.fa.includeTemporal')"
        :disabled="modelValue.length === 0"
        hide-details
        data-testid="linked-fa-picker-include-temporal"
        @update:model-value="(value) => setDesignFlag('includeTemporal', !!value)"
      >
        <template #label>
          <AtlasIcon
            size="small"
            class="linked-fa-picker__label-icon"
            aria-hidden="true"
          >
            {{ CAPABILITY.includeTemporal.icon }}
          </AtlasIcon>
          {{ tv('cc.viewEdit.design.fa.includeTemporal') }}
        </template>
      </AtlasCheckbox>
    </div>

    <AtlasDialog
      v-model="dialogOpen"
      :eyebrow="tv('components.characterizationDesign.detailsEyebrow')"
      :title="t('cc.modals.selectFeatureAnalyses').value"
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
        >
          <template #[`item.name`]="{ item }">
            <span class="linked-fa-picker__name-cell">
              <span>{{ item.name }}</span>
              <span
                v-for="flag in supportedFlags(item)"
                :key="flag"
                class="linked-fa-picker__capability"
                role="img"
                :aria-label="tv(CAPABILITY[flag].supportsKey)"
                :data-testid="`linked-fa-picker-dialog-${CAPABILITY[flag].testId}-${item.id}`"
              >
                <AtlasIcon
                  size="small"
                  aria-hidden="true"
                >
                  {{ CAPABILITY[flag].icon }}
                </AtlasIcon>
                <AtlasTooltip
                  activator="parent"
                  location="top"
                  :text="tv(CAPABILITY[flag].supportsKey)"
                />
              </span>
            </span>
          </template>
        </AtlasDataTable>
      </div>
      <template #actions>
        <AtlasButton
          variant="ghost"
          data-testid="linked-fa-picker-cancel"
          @click="dialogOpen = false"
        >
          {{ t('common.cancel') }}
        </AtlasButton>
        <AtlasButton
          :disabled="selectedIds.length === 0"
          data-testid="linked-fa-picker-confirm"
          @click="confirmAdd"
        >
          {{ t('common.addFeatureAnalysis') }}
        </AtlasButton>
      </template>
    </AtlasDialog>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasCheckbox, AtlasDataTable, AtlasDialog, AtlasFacetFilterBar, AtlasIcon, AtlasIconButton, AtlasList, AtlasListItem, AtlasTooltip } from '@/components/ui'
import { computed, ref } from 'vue'

import { useI18n } from '@/composables/useI18n'
import { TIME_SERIES_ICONS } from '@/constants/characterization-time-series'
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
  { title: t('columns.name').value, key: 'name' },
  { title: t('columns.type').value, key: 'type' },
  {
    title: t('columns.description').value,
    key: 'description',
  },
])

const selectableItems = computed(() =>
  filteredAnalyses.value.map(fa => ({
    id: fa.id,
    name: fa.name,
    type: fa.type,
    description: fa.description ?? '',
    supportsAnnual: fa.supportsAnnual,
    supportsTemporal: fa.supportsTemporal,
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
      supportsAnnual: fa.supportsAnnual,
      supportsTemporal: fa.supportsTemporal,
      includeAnnual: includeAnnual.value,
      includeTemporal: includeTemporal.value,
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

type DesignFlag = 'includeAnnual' | 'includeTemporal'

// The same icon marks the rows that support an option and that option's
// checkbox, so users can see which analyses a checkbox will affect.
const CAPABILITY = {
  includeAnnual: {
    icon: TIME_SERIES_ICONS.annual,
    supports: 'supportsAnnual',
    supportsKey: 'cc.viewEdit.design.fa.supportsAnnual',
    testId: 'supports-annual',
  },
  includeTemporal: {
    icon: TIME_SERIES_ICONS.temporal,
    supports: 'supportsTemporal',
    supportsKey: 'cc.viewEdit.design.fa.supportsTemporal',
    testId: 'supports-temporal',
  },
} as const satisfies Record<DesignFlag, {
  icon: string
  supports: 'supportsAnnual' | 'supportsTemporal'
  supportsKey: string
  testId: string
}>

// Rows added before the supports flags were copied over may lack them, so
// fall back to the library entry.
function supportedFlags(fa: { id: number; supportsAnnual?: boolean; supportsTemporal?: boolean }): DesignFlag[] {
  const match = props.availableFeatureAnalyses.find(a => a.id === fa.id)
  return (Object.keys(CAPABILITY) as DesignFlag[]).filter(flag => {
    const key = CAPABILITY[flag].supports
    return (fa[key] ?? match?.[key]) === true
  })
}

const includeAnnual = computed(() => props.modelValue.some(fa => fa.includeAnnual === true))
const includeTemporal = computed(() => props.modelValue.some(fa => fa.includeTemporal === true))

function setDesignFlag(flag: DesignFlag, value: boolean) {
  emit(
    'update:modelValue',
    props.modelValue.map(fa => ({ ...fa, [flag]: value }))
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

.linked-fa-picker__capability {
  display: inline-flex;
  align-items: center;
  margin-right: 2px;
  color: var(--atlas-color-on-surface-variant);
}

.linked-fa-picker__name-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.linked-fa-picker__label-icon {
  margin-right: 4px;
}

.linked-fa-picker__design-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0 16px;
}

.linked-fa-picker__dialog-body {
  max-height: 60vh;
  overflow-y: auto;
}
</style>
