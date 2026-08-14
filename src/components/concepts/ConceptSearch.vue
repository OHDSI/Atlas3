<template>
  <div class="concept-search">
    <!-- Hero search input — sits directly on the page card, no inner
         wrapper. Enter triggers the search; minimum 3 characters
         enforced via validation. -->
    <div class="concept-search__hero">
      <AtlasTextField
        v-model="searchInput"
        :placeholder="
          t('search.placeholder', 'Search SNOMED, ICD, RxNorm, LOINC… (Enter to search)').value
        "
        prepend-icon="mdi-magnify"
        clearable
        variant="outlined"
        hide-details
        :disabled="loading"
        :loading="loading"
        class="concept-search__input"
        @update:model-value="(v) => onSearchInput(v as string | null)"
        @click:clear="onClear"
        @keyup.enter="onSearch"
      />

      <p class="concept-search__hint">
        <span v-if="validationError">{{ validationError }}</span>
        <span v-else>{{
          t(
            'search.vocabulariesInfo',
            'Type at least 3 characters; press Enter to search across SNOMED, ICD, RxNorm, LOINC, and other vocabularies.'
          )
        }}</span>
      </p>
    </div>

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

    <!-- Facet filters over the returned results (vocabulary, domain, …). -->
    <ConceptFacetFilters
      v-if="!store.isEmpty"
      :facet-options="store.facetOptions"
      :selected="store.selectedFacets"
      :active-filter-count="store.activeFacetCount"
      :result-filter="store.resultFilter"
      class="concept-search__filters"
      @update:facet="({ key, values }) => store.setFacet(key, values)"
      @update:result-filter="(v: string) => store.setResultFilter(v)"
      @clear="store.clearFacets()"
    />

    <ConceptAddOptions
      v-if="!store.isEmpty"
      v-model="addFlags"
      :selected-count="selected.length"
      class="concept-search__add-options"
      @add="onAddSelected"
    />

    <!-- Results Table -->
    <ConceptTable
      v-model:selected="selected"
      :concepts="store.concepts"
      :loading="store.loading"
      :loading-record-counts="store.loadingRecordCounts"
      :total-items="store.totalCount"
      :page="store.page"
      :items-per-page="store.itemsPerPage"
      :linkable="true"
      :source-key="selectedSourceKey"
      :show-add-button="true"
      :selectable="true"
      :concepts-in-set="conceptsInSet"
      @update:page="onPageChange"
      @update:items-per-page="onItemsPerPageChange"
      @add-concept="onAddConcept"
      @remove-concept="onRemoveConcept"
    />

    <AtlasSnackbar
      v-model="feedback.open"
      severity="success"
      :text="feedback.text"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { AtlasAlert, AtlasSnackbar, AtlasTextField } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useConceptSearchStore } from '@/stores/concept-search'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useWebAPIStore } from '@/stores/webapi'
import { getSourceKey } from '@/config/webapi'
import ConceptTable from './ConceptTable.vue'
import ConceptFacetFilters from './ConceptFacetFilters.vue'
import ConceptAddOptions from './ConceptAddOptions.vue'
import type { Concept, ConceptAddFlags } from '@/models/concept-set.types'

const { t } = useI18n()

// ============================================================================
// Store
// ============================================================================

const store = useConceptSearchStore()
const conceptSetsStore = useConceptSetsStore()
const webapiStore = useWebAPIStore()
const selectedSourceKey = computed(
  () => webapiStore.getValidVocabularySource() || getSourceKey() || '',
)

// Concepts already present in the current (in-progress) set — drives the
// Add/Remove toggle in ConceptTable.
const conceptsInSet = computed(() => {
  const ids = new Set<number>()
  conceptSetsStore.currentSet?.items.forEach(item => ids.add(item.conceptId))
  return ids
})

// ============================================================================
// Local State
// ============================================================================

const searchInput = ref<string>('')
const feedback = ref<{ open: boolean; text: string }>({ open: false, text: '' })
const selected = ref<number[]>([])

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
    return 'Please enter at least 3 characters'
  }
  return undefined
})

const loading = computed(() => store.loading)

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

function onSearch() {
  if (!isSearchValid.value) return

  // Immediate search when user clicks button or presses Enter
  store.search(searchInput.value.trim())
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

function onAddConcept(concept: Concept) {
  // First add with no set open: create an untitled set and open the editor.
  if (!conceptSetsStore.currentSet) {
    conceptSetsStore.openCreateEditor()
  }
  conceptSetsStore.addConceptToSet(concept, addFlags.value)

  feedback.value = {
    open: true,
    text: t('search.addedToSet', 'Added “{concept}” → {set}', {
      concept: concept.conceptName,
      set: currentSetName(),
    }).value,
  }
}

function onAddSelected() {
  const ids = new Set(selected.value)
  if (ids.size === 0) return

  if (!conceptSetsStore.currentSet) {
    conceptSetsStore.openCreateEditor()
  }

  // Concepts already in the set are skipped by the store, so count what
  // actually landed rather than what was ticked.
  const before = conceptSetsStore.currentSet?.items.length ?? 0
  for (const concept of store.allConcepts.filter(c => ids.has(c.conceptId))) {
    conceptSetsStore.addConceptToSet(concept, addFlags.value)
  }
  const added = (conceptSetsStore.currentSet?.items.length ?? 0) - before
  selected.value = []

  feedback.value = {
    open: true,
    text: t('search.addedCountToSet', 'Added {count} concepts → {set}', {
      count: added,
      set: currentSetName(),
    }).value,
  }
}

function currentSetName(): string {
  return (
    conceptSetsStore.currentSet?.name ||
    t('components.conceptSetBuilder.newConceptSet', 'New concept set').value
  )
}

function onRemoveConcept(concept: Concept) {
  conceptSetsStore.removeConceptFromSet(concept.conceptId)
}
</script>

<style scoped>
.concept-search {
  width: 100%;
}

.concept-search__hero {
  margin-bottom: 16px;
}

.concept-search__filters {
  margin-bottom: 16px;
}

.concept-search__input :deep(.v-field) {
  min-height: 48px;
  font-size: 14px;
}
.concept-search__input :deep(.v-field__input) {
  font-size: 14px;
}

.concept-search__hint {
  margin: 6px 4px 0;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
