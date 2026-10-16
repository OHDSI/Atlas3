<template>
  <div class="concept-search-inline">
    <!-- Search Input -->
    <AtlasTextField
      v-model="searchInput"
      :label="tv('common.search')"
      :placeholder="tv('search.placeholder')"
      prepend-icon="mdi-magnify"
      clearable
      variant="outlined"
      :error="validationError"
      :disabled="loading"
      class="mb-4"
      @update:model-value="(v: string | number) => onSearchInput(v != null ? String(v) : null)"
      @click:clear="onClear"
      @keyup.enter="onSearch"
    >
      <template #append>
        <AtlasButton
          :disabled="!isSearchValid || loading"
          :loading="loading"
          @click="onSearch"
        >
          {{ t('common.search') }}
        </AtlasButton>
      </template>
    </AtlasTextField>

    <!-- Error Message -->
    <AtlasAlert
      v-if="store.error"
      severity="danger"
      :closable="true"
      class="mb-4"
      @close="store.error = null"
    >
      {{ store.error }}
    </AtlasAlert>

    <ConceptFacetFilters
      v-if="!store.isEmpty"
      :facet-options="store.facetOptions"
      :selected="store.selectedFacets"
      :active-filter-count="store.activeFacetCount"
      :result-filter="store.resultFilter"
      class="mb-4"
      @update:facet="onFacetUpdate"
      @update:result-filter="(v: string) => store.setResultFilter(v)"
      @clear="onClearFacets"
    >
      <template
        v-if="recordCountSources.length > 0"
        #append
      >
        <AtlasSelect
          :model-value="effectiveRecordCountSource"
          :items="recordCountSources"
          item-title="sourceName"
          item-value="sourceKey"
          :label="viewCountsForLabel"
          density="compact"
          variant="outlined"
          hide-details
          :loading="store.loadingRecordCounts"
          :menu-props="{ zIndex: 2300 }"
          data-testid="record-count-source"
          @update:model-value="(v: unknown) => store.setRecordCountSource(String(v))"
        />
      </template>
    </ConceptFacetFilters>

    <ConceptAddOptions
      v-if="!store.isEmpty && !selectionMode"
      v-model="addFlags"
      :selected-count="selected.length"
      class="mb-4"
      @add="onAddSelected"
    />

    <!-- Results Table with Add/Remove buttons -->
    <ConceptTable
      v-model:selected="selected"
      :concepts="store.concepts"
      :loading="store.loading"
      :loading-record-counts="store.loadingRecordCounts"
      :total-items="store.totalCount"
      :page="store.page"
      :items-per-page="store.itemsPerPage"
      :selectable="true"
      :concepts-in-set="conceptsInSet"
      @update:page="onPageChange"
      @update:items-per-page="onItemsPerPageChange"
      @add-concept="onAddConcept"
      @remove-concept="onRemoveConcept"
      @view-concept="(payload) => emit('view-concept', payload)"
    />

    <div
      v-if="selectionMode"
      class="d-flex justify-end ga-2 mt-4"
    >
      <AtlasButton
        variant="secondary"
        data-testid="concept-selection-cancel"
        @click="emit('selection-cancelled')"
      >
        {{ t('common.cancel') }}
      </AtlasButton>
      <AtlasButton
        :disabled="selected.length === 0"
        data-testid="concept-selection-complete"
        @click="completeSelection"
      >
        {{ t('common.add') }} ({{ selected.length }})
      </AtlasButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { AtlasAlert, AtlasButton, AtlasSelect, AtlasTextField } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useConceptPickerSearchStore, useConceptSetSearchStore } from '@/stores/concept-search'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useWebAPIStore } from '@/stores/webapi'
import { getSourceKey } from '@/config/webapi'
import ConceptTable from './ConceptTable.vue'
import ConceptFacetFilters from './ConceptFacetFilters.vue'
import ConceptAddOptions from './ConceptAddOptions.vue'
import type { Concept, ConceptAddFlags } from '@/models/concept-set.types'

const { t, tv } = useI18n()

const props = withDefaults(defineProps<{
  selectionMode?: boolean
  domainFilter?: string
  preselectedConceptIds?: number[]
}>(), {
  selectionMode: false,
  domainFilter: undefined,
  preselectedConceptIds: () => [],
})
const selectionMode = computed(() => props.selectionMode)

// ============================================================================
// Stores
// ============================================================================

const store = props.selectionMode
  ? useConceptPickerSearchStore()
  : useConceptSetSearchStore()
const conceptSetsStore = useConceptSetsStore()
const webapiStore = useWebAPIStore()

const selectedSourceKey = computed(
  () => webapiStore.getValidVocabularySource() || getSourceKey() || ''
)
const viewCountsForLabel = t('search.viewCountMessage')

// Only sources that can report counts; a vocabulary-only source would blank the columns.
const recordCountSources = computed(() => webapiStore.resultsSources ?? [])
const effectiveRecordCountSource = computed(
  () => store.recordCountSourceKey ?? selectedSourceKey.value
)

// ============================================================================
// Emits
// ============================================================================

const emit = defineEmits<{
  'add-concept': [concept: Concept, flags: Required<ConceptAddFlags>]
  'add-concepts': [concepts: Concept[], flags: Required<ConceptAddFlags>]
  'remove-concept': [concept: Concept]
  'view-concept': [payload: { conceptId: number; sourceKey: string }]
  'selection-complete': [concepts: Concept[]]
  'selection-cancelled': []
}>()

// ============================================================================
// Local State
// ============================================================================

const searchInput = ref<string>('')
const selected = ref<number[]>([])
const selectedDomains = ref<string[]>(props.domainFilter ? [props.domainFilter] : [])

watch(
  () => props.preselectedConceptIds,
  ids => {
    selected.value = [...ids]
  },
  { immediate: true }
)

watch(
  () => props.domainFilter,
  domain => {
    selectedDomains.value = domain ? [domain] : []
    applyDomainFilter()
  }
)

// Sticky across searches on purpose: the point of the add box is to set the
// intent once and then collect concepts over several queries.
const addFlags = ref<Required<ConceptAddFlags>>({
  isExcluded: false,
  includeDescendants: false,
  includeMapped: false,
})

// ============================================================================
// Computed
// ============================================================================

const isSearchValid = computed(() => {
  return searchInput.value.trim().length >= 3
})

const validationError = computed(() => {
  const trimmed = searchInput.value.trim()
  if (trimmed.length > 0 && trimmed.length < 3) {
    return t('search.minLengthHint', { min: 3 }).value
  }
  return undefined
})

const loading = computed(() => store.loading)

// Track which concepts are already in the current set
const conceptsInSet = computed(() => {
  const set = new Set<number>()
  conceptSetsStore.currentSet?.items.forEach(item => {
    set.add(item.conceptId)
  })
  return set
})

// ============================================================================
// Methods
// ============================================================================

function onSearchInput(value: string | null) {
  if (!value) {
    store.clearSearch()
    return
  }

  // Search is only triggered by clicking the search button or pressing Enter
  // No auto-search on typing to avoid blocking user flow
}

async function onSearch() {
  if (!isSearchValid.value) return

  // Immediate search when user clicks button or presses Enter
  const term = searchInput.value.trim()
  if (selectedDomains.value.length > 0) {
    await store.search(term, { domains: selectedDomains.value })
  } else {
    await store.search(term)
  }
  applyDomainFilter()
}

function onClear() {
  searchInput.value = ''
  store.clearSearch()
}

function onPageChange(page: number) {
  store.updatePagination(page, store.itemsPerPage)
}

function onItemsPerPageChange(itemsPerPage: number) {
  store.updatePagination(1, itemsPerPage)
}

function applyDomainFilter() {
  store.setFacet('domainId', selectedDomains.value)
}

function onFacetUpdate({ key, values }: { key: string; values: string[] }) {
  if (key === 'domainId') {
    selectedDomains.value = values
  }
  store.setFacet(key, values)
}

function onClearFacets() {
  selectedDomains.value = []
  store.clearFacets()
}

function onAddConcept(concept: Concept) {
  emit('add-concept', concept, addFlags.value)
}

function onAddSelected() {
  const ids = new Set(selected.value)
  if (ids.size === 0) return

  emit(
    'add-concepts',
    store.allConcepts.filter(c => ids.has(c.conceptId)),
    addFlags.value
  )
  selected.value = []
}

function completeSelection() {
  const ids = new Set(selected.value)
  if (ids.size === 0) return

  emit('selection-complete', store.allConcepts.filter(concept => ids.has(concept.conceptId)))
  selected.value = []
}

function onRemoveConcept(concept: Concept) {
  emit('remove-concept', concept)
}
</script>

<style scoped>
.concept-search-inline {
  width: 100%;
  /* The search field sits as the first element inside the tab's v-window,
   * whose overflow: hidden clips anything above its own top edge. With no
   * clearance here, the outlined field's floating label — which renders
   * above the field's own box — gets its top sliced off (#254). */
  padding-top: 8px;
}
</style>
