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

    <ConceptAddOptions
      v-if="!store.isEmpty"
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
      :total-items="store.totalCount"
      :page="store.page"
      :items-per-page="store.itemsPerPage"
      :show-add-button="true"
      :selectable="true"
      :concepts-in-set="conceptsInSet"
      @update:page="onPageChange"
      @update:items-per-page="onItemsPerPageChange"
      @add-concept="onAddConcept"
      @remove-concept="onRemoveConcept"
      @view-concept="(payload) => emit('view-concept', payload)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { AtlasAlert, AtlasButton, AtlasTextField } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useConceptSearchStore } from '@/stores/concept-search'
import { useConceptSetsStore } from '@/stores/concept-sets'
import ConceptTable from './ConceptTable.vue'
import ConceptAddOptions from './ConceptAddOptions.vue'
import type { Concept, ConceptAddFlags } from '@/models/concept-set.types'

const { t, tv } = useI18n()

// ============================================================================
// Stores
// ============================================================================

const store = useConceptSearchStore()
const conceptSetsStore = useConceptSetsStore()

// ============================================================================
// Emits
// ============================================================================

const emit = defineEmits<{
  'add-concept': [concept: Concept, flags: Required<ConceptAddFlags>]
  'add-concepts': [concepts: Concept[], flags: Required<ConceptAddFlags>]
  'remove-concept': [concept: Concept]
  'view-concept': [payload: { conceptId: number; sourceKey: string }]
}>()

// ============================================================================
// Local State
// ============================================================================

const searchInput = ref<string>('')
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

function onRemoveConcept(concept: Concept) {
  emit('remove-concept', concept)
}
</script>

<style scoped>
.concept-search-inline {
  width: 100%;
}
</style>
