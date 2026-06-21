<template>
  <div class="compare-tab">
    <div class="compare-tab__bar mb-4">
      <div class="compare-tab__bar-left">
        <span class="text-body-2 text-medium-emphasis">
          {{ t('cs.browser.compare.conceptSet1', 'Concept Set 1:') }}
        </span>
        <AtlasChip
          size="sm"
          tone="primary"
        >
          {{ store.currentSet?.name || t('common.untitled', 'Untitled').value }}
        </AtlasChip>

        <span class="text-body-2 text-medium-emphasis ml-4">
          {{ t('cs.browser.compare.conceptSet2', 'Concept Set 2:') }}
        </span>
        <AtlasChip
          v-if="store.comparisonOtherSet"
          size="sm"
          tone="info"
          variant="tonal"
          closable
          @close="onClearOther"
        >
          {{ store.comparisonOtherSet.name }}
        </AtlasChip>
        <AtlasButton
          v-else
          variant="secondary"
          size="sm"
          icon="mdi-folder-open-outline"
          data-testid="compare-pick-other"
          @click="showChooser = true"
        >
          {{ t('common.choose', 'Choose').value }}
        </AtlasButton>
      </div>

      <div class="compare-tab__bar-right">
        <AtlasButton
          variant="ghost"
          size="sm"
          icon="mdi-download"
          :disabled="store.comparison.length === 0 || store.loadingComparison"
          data-testid="compare-export"
          @click="onExport"
        >
          {{ t('common.export', 'Export').value }}
        </AtlasButton>
        <AtlasButton
          size="sm"
          icon="mdi-compare"
          :disabled="!canCompare || store.loadingComparison"
          :loading="store.loadingComparison"
          data-testid="compare-run"
          @click="onCompare"
        >
          {{ t('cs.browser.compare.compareConceptSets', 'Compare Concept Sets') }}
        </AtlasButton>
      </div>
    </div>

    <div
      class="compare-tab__modes mb-4"
      role="group"
      :aria-label="t('cs.browser.compare.modeGroupLabel', 'Comparison level').value"
    >
      <AtlasButton
        v-for="m in modes"
        :key="m.value"
        size="sm"
        :variant="store.comparisonMode === m.value ? 'tonal' : 'secondary'"
        :tone="store.comparisonMode === m.value ? undefined : 'neutral'"
        :data-testid="`mode-${m.value}`"
        @click="onModeChange(m.value)"
      >
        {{ m.label }}
      </AtlasButton>
    </div>

    <AtlasAlert
      v-if="store.comparisonError"
      severity="danger"
      :closable="true"
      class="mb-4"
      @close="store.comparisonError = null"
    >
      {{ store.comparisonError }}
    </AtlasAlert>

    <AtlasAlert
      v-else-if="!hasOwnItems"
      severity="info"
      class="mb-4"
      data-testid="compare-no-current"
    >
      {{
        t(
          'cs.browser.compare.headingMessage',
          'Use this utility to compare the contents of two concept sets to see which concepts they may share'
        )
      }}
    </AtlasAlert>

    <div
      v-if="store.loadingComparison && store.comparison.length === 0"
      class="d-flex align-center justify-center py-12"
      data-testid="compare-loading"
    >
      <AtlasProgressCircular
        indeterminate
        color="primary"
        size="32"
        class="mr-3"
      />
      <span>{{ t('cs.browser.compare.compareConceptSets', 'Compare Concept Sets') }}…</span>
    </div>

    <template v-if="store.comparison.length > 0">
      <v-card
        variant="flat"
        class="compare-tab__venn-wrap mb-4"
      >
        <v-card-title class="text-subtitle-1">
          {{ t('cs.browser.compare.vennDiagram', 'Venn Diagram') }}
        </v-card-title>
        <v-card-text class="d-flex justify-center">
          <ComparisonVennDiagram
            :left-only="leftOnly"
            :right-only="rightOnly"
            :both="bothCount"
            :left-label="leftLabel"
            :right-label="rightLabel"
            class="compare-tab__venn"
          />
        </v-card-text>
      </v-card>

      <AtlasDataTable
        :headers="headers"
        :items="rows"
        :items-per-page="25"
        class="compare-tab__table"
      >
        <template #item.match="{ item }">
          <AtlasChip
            :tone="matchTone(item.match)"
            size="sm"
            variant="tonal"
          >
            {{ item.match }}
          </AtlasChip>
        </template>
      </AtlasDataTable>
    </template>

    <ConceptSetChooserDialog
      v-model="showChooser"
      :exclude-id="store.currentSet?.id"
      @select="onOtherSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasChip, AtlasDataTable, AtlasProgressCircular } from '@/components/ui'
import { ref, computed, inject, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { ComparisonMode } from '@/stores/concept-sets'
import { useWebAPIStore } from '@/stores/webapi'
import { arrayToCsv, downloadCsv } from '@/utils/csv'
import ComparisonVennDiagram from './ComparisonVennDiagram.vue'
import ConceptSetChooserDialog from './ConceptSetChooserDialog.vue'
import type { ComparisonResultItem } from '@/models/concept-set.types'

const props = defineProps<{ active: boolean }>()

const { t } = useI18n()

const store = useConceptSetsStore()
const webapiStore = useWebAPIStore()

const injectedSourceKey = inject<{ value: string }>('sourceKey', { value: '' })
const sourceKey = computed<string>(() => {
  return webapiStore.getValidVocabularySource() || injectedSourceKey.value
})

watch(
  () => props.active,
  active => {
    if (active && webapiStore.sources.length === 0 && !webapiStore.isLoadingSources) {
      void webapiStore.fetchSources()
    }
  },
  { immediate: true }
)

const showChooser = ref(false)

const hasOwnItems = computed(() => (store.currentSet?.items.length ?? 0) > 0)

const canCompare = computed(() => {
  return (
    hasOwnItems.value &&
    store.comparisonOtherSet !== null &&
    store.currentSet?.id !== undefined &&
    !!sourceKey.value
  )
})

const leftLabel = computed(() => store.currentSet?.name || 'CS1')
const rightLabel = computed(() => store.comparisonOtherSet?.name || 'CS2')

const leftOnly = computed(() => store.comparison.filter(r => r.conceptIn1Only === 1).length)
const rightOnly = computed(() => store.comparison.filter(r => r.conceptIn2Only === 1).length)
const bothCount = computed(() => store.comparison.filter(r => r.conceptIn1And2 === 1).length)

interface Row extends ComparisonResultItem {
  match: string
}

const rows = computed<Row[]>(() =>
  store.comparison.map(r => ({
    ...r,
    match:
      r.conceptIn1And2 === 1
        ? t('common.both', 'Both').value
        : r.conceptIn1Only === 1
          ? leftLabel.value
          : rightLabel.value,
  }))
)

const headers = computed(() => [
  { title: t('common.match', 'Match').value, key: 'match', sortable: true, width: '120px' },
  {
    title: t('columns.conceptId', 'Concept Id').value,
    key: 'conceptId',
    sortable: true,
    width: '110px',
  },
  {
    title: t('columns.conceptCode', 'Concept Code').value,
    key: 'conceptCode',
    sortable: true,
    width: '130px',
  },
  { title: t('columns.conceptName', 'Concept Name').value, key: 'conceptName', sortable: true },
  { title: t('columns.domain', 'Domain').value, key: 'domainId', sortable: true, width: '120px' },
  {
    title: t('columns.vocabulary', 'Vocabulary').value,
    key: 'vocabularyId',
    sortable: true,
    width: '120px',
  },
  {
    title: t('columns.class', 'Class').value,
    key: 'conceptClassId',
    sortable: true,
    width: '140px',
  },
])

function matchTone(label: string): 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger' {
  if (label === t('common.both', 'Both').value) return 'success'
  if (label === leftLabel.value) return 'primary'
  return 'info'
}

function onOtherSelected(id: number) {
  store.comparison = []
  store.comparisonError = null
  void preloadOther(id)
}

async function preloadOther(id: number) {
  store.loadingComparison = true
  try {
    const { getConceptSetById } = await import('@/services/concept-set.service')
    const set = await getConceptSetById(id)
    if (set) store.comparisonOtherSet = set
  } finally {
    store.loadingComparison = false
  }
}

const modes = computed(
  () =>
    [
      { value: 'expression', label: t('cs.browser.compare.modeExpression', 'Expression concepts').value },
      { value: 'included', label: t('cs.browser.compare.modeIncluded', 'Included concepts').value },
      { value: 'source', label: t('cs.browser.compare.modeSource', 'Source concepts').value },
    ] as const
)

function onModeChange(mode: ComparisonMode) {
  store.comparisonMode = mode
  // Lazy: compute (or serve from cache) only when a comparison can run.
  if (canCompare.value && store.comparisonOtherSet?.id != null) {
    void store.loadComparisonForMode(sourceKey.value, store.comparisonOtherSet.id, mode)
  }
}

function onCompare() {
  if (!canCompare.value || store.comparisonOtherSet?.id == null) return
  // A fresh Compare recomputes from scratch, dropping any cached modes.
  store.clearComparisonCache()
  void store.loadComparisonForMode(sourceKey.value, store.comparisonOtherSet.id, store.comparisonMode)
}

function onClearOther() {
  store.comparisonOtherSet = null
  store.comparison = []
  store.comparisonError = null
}

function onExport() {
  if (store.comparison.length === 0) return
  const csv = arrayToCsv(rows.value, [
    { key: 'match', label: 'Match' },
    { key: 'conceptId', label: 'Concept Id' },
    { key: 'conceptCode', label: 'Concept Code' },
    { key: 'conceptName', label: 'Concept Name' },
    { key: 'domainId', label: 'Domain' },
    { key: 'vocabularyId', label: 'Vocabulary' },
    { key: 'conceptClassId', label: 'Class' },
    { key: 'standardConcept', label: 'Standard' },
    { key: 'invalidReason', label: 'Invalid Reason' },
  ])
  const left = (store.currentSet?.name ?? 'cs1').replace(/\s+/g, '_')
  const right = (store.comparisonOtherSet?.name ?? 'cs2').replace(/\s+/g, '_')
  downloadCsv(`compare_${left}_vs_${right}.csv`, csv)
}
</script>

<style scoped>
.compare-tab__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.compare-tab__bar-left,
.compare-tab__bar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.compare-tab__modes {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.compare-tab__venn {
  max-width: 480px;
  width: 100%;
}
</style>
