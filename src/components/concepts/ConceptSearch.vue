<template>
  <div
    class="concept-search"
    :class="{ 'concept-search--embedded': searchVariant === 'embedded' }"
  >
    <div class="concept-search__hero">
      <AtlasTextField
        v-model="searchInput"
        :label="searchVariant === 'embedded' ? t('common.search').value : undefined"
        :placeholder="t('search.placeholder').value"
        prepend-icon="mdi-magnify"
        clearable
        variant="outlined"
        :hide-details="searchVariant === 'page'"
        :error="searchVariant === 'embedded' ? validationError : undefined"
        :disabled="store.loading"
        :loading="store.loading"
        class="concept-search__input"
        @update:model-value="onSearchInput"
        @click:clear="onClear"
        @keyup.enter="onSearch"
      >
        <template
          v-if="searchVariant === 'embedded'"
          #append
        >
          <AtlasButton
            :disabled="!isSearchValid || store.loading"
            :loading="store.loading"
            @click="onSearch"
          >
            {{ t('common.search').value }}
          </AtlasButton>
        </template>
      </AtlasTextField>

      <p
        v-if="searchVariant === 'page'"
        class="concept-search__hint"
      >
        {{ validationError ?? t('search.vocabulariesInfo').value }}
      </p>
    </div>

    <AtlasAlert
      v-if="store.error"
      severity="danger"
      closable
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
      class="concept-search__filters"
      @update:facet="onFacetUpdate"
      @update:result-filter="store.setResultFilter"
      @clear="onClearFacets"
    >
      <template #after-filter>
        <ConceptColumnChooser />
      </template>

      <template #append>
        <AtlasSelect
          v-if="recordCountSources.length > 0"
          :model-value="effectiveRecordCountSource"
          :items="recordCountSources"
          item-title="sourceName"
          item-value="sourceKey"
          :label="t('search.viewCountMessage').value"
          density="compact"
          variant="outlined"
          hide-details
          :loading="store.loadingRecordCounts"
          :menu-props="{ zIndex: 2300 }"
          data-testid="record-count-source"
          @update:model-value="value => store.setRecordCountSource(String(value))"
        />
      </template>
    </ConceptFacetFilters>

    <ConceptAddOptions
      v-if="!store.isEmpty && !selectionMode"
      v-model="addFlags"
      :selected-count="selected.length"
      class="concept-search__add-options"
      @add="onAddSelected"
    />

    <ConceptTable
      v-model:selected="selected"
      :concepts="store.concepts"
      :loading="store.loading"
      :loading-record-counts="store.loadingRecordCounts"
      :total-items="store.totalCount"
      :page="store.page"
      :items-per-page="store.itemsPerPage"
      :linkable="linkable"
      :source-key="sourceKey"
      :selectable="true"
      :concepts-in-set="conceptsInSet"
      :visible-column-keys="preferencesStore.visibleColumnKeys"
      @update:page="page => store.updatePagination(page, store.itemsPerPage)"
      @update:items-per-page="itemsPerPage => store.updatePagination(1, itemsPerPage)"
      @add-concept="concept => emit('add-concept', concept, addFlags)"
      @remove-concept="concept => emit('remove-concept', concept)"
      @view-concept="payload => emit('view-concept', payload)"
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
        {{ t('common.cancel').value }}
      </AtlasButton>
      <AtlasButton
        :disabled="selected.length === 0"
        data-testid="concept-selection-complete"
        @click="completeSelection"
      >
        {{ t('common.add').value }} ({{ selected.length }})
      </AtlasButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AtlasAlert, AtlasButton, AtlasSelect, AtlasTextField } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { FacetKey, FacetOption } from '@/composables/useConceptFacets'
import { useConceptTablePreferencesStore } from '@/stores/concept-table-preferences'
import { useWebAPIStore } from '@/stores/webapi'
import { getSourceKey } from '@/config/webapi'
import ConceptAddOptions from './ConceptAddOptions.vue'
import ConceptColumnChooser from './ConceptColumnChooser.vue'
import ConceptFacetFilters from './ConceptFacetFilters.vue'
import ConceptTable from './ConceptTable.vue'
import type { Concept, ConceptAddFlags } from '@/models/concept-set.types'

interface SearchModel {
  concepts: Concept[]
  allConcepts: Concept[]
  loading: boolean
  loadingRecordCounts: boolean
  recordCountSourceKey: string | null
  error: string | null
  page: number
  itemsPerPage: number
  totalCount: number
  isEmpty: boolean
  facetOptions: Record<FacetKey, FacetOption[]>
  selectedFacets: Record<FacetKey, string[]>
  activeFacetCount: number
  resultFilter: string
  search: (term: string, options?: { domains?: string[] }) => Promise<void>
  setFacet: (key: FacetKey, values: string[]) => void
  setResultFilter: (value: string) => void
  clearFacets: () => void
  setRecordCountSource: (sourceKey: string) => Promise<void>
  updatePagination: (page: number, itemsPerPage: number) => void
  clearSearch: () => void
}

const props = withDefaults(defineProps<{
  store: SearchModel
  searchVariant?: 'page' | 'embedded'
  initialSearchTerm?: string
  domainFilter?: string
  preselectedConceptIds?: number[]
  selectionMode?: boolean
  linkable?: boolean
  sourceKey?: string
  conceptsInSet?: Set<number>
}>(), {
  searchVariant: 'page',
  initialSearchTerm: '',
  domainFilter: undefined,
  preselectedConceptIds: () => [],
  selectionMode: false,
  linkable: false,
  sourceKey: undefined,
  conceptsInSet: () => new Set(),
})

const emit = defineEmits<{
  'add-concept': [concept: Concept, flags: Required<ConceptAddFlags>]
  'add-concepts': [concepts: Concept[], flags: Required<ConceptAddFlags>]
  'remove-concept': [concept: Concept]
  'view-concept': [payload: { conceptId: number; sourceKey: string }]
  'selection-complete': [concepts: Concept[]]
  'selection-cancelled': []
}>()

const { t } = useI18n()
const preferencesStore = useConceptTablePreferencesStore()
const webapiStore = useWebAPIStore()
const searchInput = ref('')
const selected = ref<number[]>([])
const selectedDomains = ref<string[]>(props.domainFilter ? [props.domainFilter] : [])
const addFlags = ref<Required<ConceptAddFlags>>({
  isExcluded: false,
  includeDescendants: false,
  includeMapped: false,
})

const recordCountSources = computed(() => webapiStore.resultsSources ?? [])
const effectiveRecordCountSource = computed(
  () => props.store.recordCountSourceKey ?? (webapiStore.getValidVocabularySource() || getSourceKey() || '')
)
const isSearchValid = computed(() => searchInput.value.trim().length >= 3)
const visibleColumnKeys = computed(() => preferencesStore.visibleColumnKeys)
const loading = computed(() => props.store.loading)
const validationError = computed(() => {
  const value = searchInput.value.trim()
  return value.length > 0 && value.length < 3
    ? t('search.minLengthHint', { min: 3 }).value
    : undefined
})

watch(
  () => props.initialSearchTerm,
  term => {
    if (!term) return
    searchInput.value = term
    if (term.trim().length >= 3) void onSearch()
  },
  { immediate: true }
)

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
    props.store.setFacet('domainId', selectedDomains.value)
  }
)

function onSearchInput(value: string | number | null) {
  if (!value) props.store.clearSearch()
}

async function onSearch() {
  if (!isSearchValid.value) return
  const domains = selectedDomains.value
  if (domains.length) {
    await props.store.search(searchInput.value.trim(), { domains })
  } else {
    await props.store.search(searchInput.value.trim())
  }
  props.store.setFacet('domainId', domains)
}

function onClear() {
  searchInput.value = ''
  props.store.clearSearch()
}

function onFacetUpdate({ key, values }: { key: FacetKey; values: string[] }) {
  if (key === 'domainId') selectedDomains.value = values
  props.store.setFacet(key, values)
}

function onClearFacets() {
  selectedDomains.value = []
  props.store.clearFacets()
}

function onPageChange(page: number) {
  props.store.updatePagination(page, props.store.itemsPerPage)
}

function onItemsPerPageChange(itemsPerPage: number) {
  props.store.updatePagination(1, itemsPerPage)
}

function onAddSelected() {
  const ids = new Set(selected.value)
  if (!ids.size) return
  emit('add-concepts', props.store.allConcepts.filter(concept => ids.has(concept.conceptId)), addFlags.value)
  selected.value = []
}

function completeSelection() {
  const ids = new Set(selected.value)
  if (!ids.size) return
  emit('selection-complete', props.store.allConcepts.filter(concept => ids.has(concept.conceptId)))
  selected.value = []
}

defineExpose({
  searchInput,
  validationError,
  isSearchValid,
  visibleColumnKeys,
  loading,
  onSearch,
  onPageChange,
  onItemsPerPageChange,
})
</script>

<style scoped>
.concept-search { width: 100%; }
.concept-search__hero { margin-bottom: 16px; }
.concept-search__filters { margin-bottom: 16px; }
.concept-search__add-options { margin-bottom: 16px; }
.concept-search__input :deep(.v-field) { min-height: 48px; font-size: 14px; }
.concept-search__input :deep(.v-field__input) { font-size: 14px; }
.concept-search__hint {
  margin: 6px 4px 0;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
