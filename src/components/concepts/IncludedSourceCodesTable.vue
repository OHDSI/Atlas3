<template>
  <div class="included-source-codes-table">
    <AtlasAlert
      v-if="store.sourceCodeError"
      severity="danger"
      variant="tonal"
      class="included-source-codes-table__error"
    >
      <div class="d-flex align-center">
        <span class="flex-grow-1">{{ store.sourceCodeError }}</span>
        <AtlasButton
          size="sm"
          variant="ghost"
          data-testid="source-codes-retry-btn"
          @click="store.resolveSourceCodes(props.sourceKey)"
        >
          {{ t('common.retry', 'Retry').value }}
        </AtlasButton>
      </div>
    </AtlasAlert>

    <ConceptFacetFilters
      v-if="store.sourceCodeItems.length > 0"
      :facets="facets"
      :facet-options="facetOptions"
      :selected="selectedFacets"
      :active-filter-count="activeFilterCount"
      :result-filter="textFilter"
      text-field-test-id="source-codes-result-filter"
      class="included-source-codes-table__filters"
      @update:facet="({ key, values }) => setFacet(key, values)"
      @update:result-filter="setTextFilter"
      @clear="clearFilters()"
    />

    <!-- Source codes resolve out of the expression like included concepts do,
         so acting on one means adding an expression item for it (#224). -->
    <ConceptAddOptions
      v-if="!store.sourceCodeLoading && store.sourceCodeItems.length > 0"
      v-model="addFlags"
      :selected-count="selected.length"
      class="mb-3"
      @add="onAddSelected"
    />

    <AtlasCard
      v-if="store.sourceCodeLoading || store.sourceCodeItems.length > 0"
      padding="none"
    >
      <AtlasDataTable
        v-model:sort-by="sortBy"
        v-model:items-per-page="pageSize"
        :headers="headers"
        :items="visibleSourceCodes"
        :loading="store.sourceCodeLoading"
        multi-sort
        hover
        class="included-source-codes-table__table"
      >
        <template #header.select>
          <div data-testid="included-source-codes-select-all">
            <v-checkbox-btn
              :model-value="allVisibleSelected"
              :indeterminate="someVisibleSelected && !allVisibleSelected"
              :aria-label="t('components.conceptTable.selectAllConcepts', 'Select all concepts').value"
              density="compact"
              hide-details
              @update:model-value="onToggleSelectAll"
            />
          </div>
        </template>

        <template #item.select="{ item }">
          <div :data-testid="`included-source-codes-row-checkbox-${(item as Concept).conceptId}`">
            <v-checkbox-btn
              :model-value="selectedSet.has((item as Concept).conceptId)"
              :aria-label="(item as Concept).conceptName"
              density="compact"
              hide-details
              @update:model-value="(v: boolean | null) => onToggleRow((item as Concept).conceptId, v)"
            />
          </div>
        </template>
        <template
          v-if="props.sourceKey"
          #item.conceptName="{ item }"
        >
          <a
            href="#"
            :data-testid="`source-code-name-link-${item.conceptId}`"
            class="concept-name-link"
            @click.prevent="onView(item)"
          >
            {{ item.conceptName }}
          </a>
        </template>

        <template
          v-else
          #item.conceptName="{ item }"
        >
          {{ item.conceptName }}
        </template>

        <template #item.domainId="{ item }">
          <AtlasChip
            v-if="item.domainId"
            :color="getDomainColor(item.domainId, themeStore.resolved)"
            size="xs"
            variant="tonal"
          >
            {{ item.domainId }}
          </AtlasChip>
        </template>

        <template #item.vocabularyId="{ item }">
          <AtlasChip
            v-if="item.vocabularyId"
            size="xs"
            variant="outlined"
          >
            {{ item.vocabularyId }}
          </AtlasChip>
        </template>

        <template #no-data>
          <div class="included-source-codes-table__no-match">
            <p class="included-source-codes-table__no-match-text">
              {{ t('cs.manager.emptyFilteredMessage', 'No concepts match the active filters.').value }}
            </p>
            <AtlasButton
              size="sm"
              variant="ghost"
              data-testid="source-codes-clear-filters-btn"
              @click="clearFilters()"
            >
              {{ t('versions.filterClear', 'Clear filters').value }}
            </AtlasButton>
          </div>
        </template>

        <template #loading>
          <AtlasSkeleton
            v-for="i in 5"
            :key="i"
            type="table-row"
            class="mx-2"
          />
        </template>
      </AtlasDataTable>
    </AtlasCard>

    <div
      v-else
      class="included-source-codes-table__empty"
    >
      <AtlasIcon
        icon="mdi-barcode-scan"
        size="36"
        class="included-source-codes-table__empty-icon"
      />
      <p class="included-source-codes-table__empty-text">
        {{ emptyMessage }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { Concept, ConceptAddFlags } from '@/models/concept-set.types'
import { useConceptSetsStore } from '@/stores/concept-sets'
import {
  AtlasAlert,
  AtlasButton,
  AtlasCard,
  AtlasChip,
  AtlasDataTable,
  AtlasIcon,
  AtlasSkeleton,
} from '@/components/ui'
import ConceptFacetFilters from './ConceptFacetFilters.vue'
import ConceptAddOptions from './ConceptAddOptions.vue'
import { CONCEPT_FACETS, useConceptFacets } from '@/composables/useConceptFacets'
import { getDomainColor } from '@/utils/domain-colors'
import { useThemeStore } from '@/stores/theme'

const { t } = useI18n()
const store = useConceptSetsStore()
const themeStore = useThemeStore()

interface Props {
  active: boolean
  sourceKey?: string
}
const props = defineProps<Props>()

const emit = defineEmits<{
  'view-concept': [payload: { conceptId: number; sourceKey: string }]
  'add-concepts': [concepts: Concept[], flags: Required<ConceptAddFlags>]
}>()

// Exclude by default, as on the included concepts tab: a code listed here is
// already in the set, so selecting it is usually about taking it back out.
const addFlags = ref<Required<ConceptAddFlags>>({
  isExcluded: true,
  includeDescendants: false,
  includeMapped: false,
})

const selected = ref<number[]>([])
const selectedSet = computed(() => new Set(selected.value))

// Only the rows the facets have left on screen, so select-all cannot reach
// rows the user has filtered away.
const visibleIds = computed(() => visibleSourceCodes.value.map(c => c.conceptId))
const allVisibleSelected = computed(
  () => visibleIds.value.length > 0 && visibleIds.value.every(id => selectedSet.value.has(id))
)
const someVisibleSelected = computed(() => visibleIds.value.some(id => selectedSet.value.has(id)))

function onToggleRow(conceptId: number, checked: boolean | null) {
  selected.value = checked
    ? [...selected.value, conceptId]
    : selected.value.filter(id => id !== conceptId)
}

function onToggleSelectAll(checked: boolean | null) {
  if (checked) {
    selected.value = [...new Set([...selected.value, ...visibleIds.value])]
    return
  }
  const dropped = new Set(visibleIds.value)
  selected.value = selected.value.filter(id => !dropped.has(id))
}

function onAddSelected() {
  if (selected.value.length === 0) return
  const picked = store.sourceCodeItems.filter(c => selectedSet.value.has(c.conceptId))
  emit('add-concepts', picked, { ...addFlags.value })
  selected.value = []
}

const sortBy = ref([{ key: 'conceptId', order: 'asc' as const }])

/**
 * See IncludedConceptsTable: a bare `:items-per-page` makes v-data-table's model
 * controlled, so the footer's dropdown emits and is then overwritten. Owning the
 * value here is what makes it live (issue #266).
 */
const pageSize = ref(50)

/** Facets mirror this table's categorical columns: class, domain and vocabulary. */
const facets = CONCEPT_FACETS.filter(f =>
  ['conceptClassId', 'domainId', 'vocabularyId'].includes(f.key)
)

const sourceCodeItems = computed(() => store.sourceCodeItems)

const {
  facetOptions,
  selected: selectedFacets,
  textFilter,
  filteredConcepts: visibleSourceCodes,
  activeFilterCount,
  setFacet,
  setTextFilter,
  clearFilters,
} = useConceptFacets(sourceCodeItems, facets)

const headers = [
  { title: '', key: 'select', sortable: false, width: '48px' },
  { title: t('columns.conceptId', 'ID').value, key: 'conceptId', sortable: true, width: '90px' },
  { title: t('columns.conceptCode', 'Code').value, key: 'conceptCode', sortable: true, width: '110px' },
  { title: t('columns.conceptName', 'Name').value, key: 'conceptName', sortable: true },
  { title: t('columns.class', 'Class').value, key: 'conceptClassId', sortable: true, width: '150px' },
  { title: t('columns.domain', 'Domain').value, key: 'domainId', sortable: true, width: '120px' },
  { title: t('columns.vocabulary', 'Vocabulary').value, key: 'vocabularyId', sortable: true, width: '120px' },
]

// Signature of the included concept ids — re-resolve when it changes while active.
const includedSignature = computed(() =>
  store.includedItems.map((c) => c.conceptId).join(','),
)

const emptyMessage = computed(() => {
  if (store.includedItems.length === 0) {
    return t(
      'cs.manager.sourceCodesEmptyNoIncluded',
      'Add concepts to see their mapped source codes here.',
    ).value
  }
  return t(
    'cs.manager.sourceCodesEmpty',
    'No source codes map to the included concepts.',
  ).value
})

watch(
  () => [props.active, includedSignature.value, props.sourceKey] as const,
  ([active, sig, key], prev) => {
    if (!active) return
    const [prevActive, prevSig, prevKey] = prev ?? [false, '', undefined]
    if (active !== prevActive || sig !== prevSig || key !== prevKey) {
      // A different included set resolves to a different value space, so a
      // stale selection would silently hide rows the user just produced.
      if (sig !== prevSig || key !== prevKey) clearFilters()
      void store.resolveSourceCodes(key)
    }
  },
  { immediate: true },
)

function onView(c: Concept) {
  emit('view-concept', { conceptId: c.conceptId, sourceKey: props.sourceKey! })
}
</script>

<style scoped>
.included-source-codes-table {
  width: 100%;
}

.included-source-codes-table__filters {
  margin-bottom: 12px;
}

.included-source-codes-table__no-match {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 24px;
}

.included-source-codes-table__no-match-text {
  margin: 0;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.included-source-codes-table__error {
  margin-bottom: 12px;
}

.included-source-codes-table__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 56px 24px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface-variant));
}

.included-source-codes-table__empty-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
}

.included-source-codes-table__empty-text {
  margin: 0;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
  text-align: center;
  max-width: 480px;
}

.concept-name-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.concept-name-link:hover {
  text-decoration: underline;
}
</style>
