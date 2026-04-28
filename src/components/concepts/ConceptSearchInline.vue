<template>
  <div class="concept-search-inline">
    <!-- Search Input -->
    <v-text-field
      v-model="searchInput"
      :label="tv('common.search')"
      :placeholder="tv('search.placeholder')"
      prepend-inner-icon="mdi-magnify"
      clearable
      variant="outlined"
      density="comfortable"
      :error-messages="validationError"
      :disabled="loading"
      class="mb-4"
      @update:model-value="onSearchInput"
      @click:clear="onClear"
      @keyup.enter="onSearch"
    >
      <template #append>
        <v-btn
          color="primary"
          :disabled="!isSearchValid || loading"
          :loading="loading"
          @click="onSearch"
        >
          {{ t('common.search') }}
        </v-btn>
      </template>
    </v-text-field>

    <!-- Error Message -->
    <v-alert
      v-if="store.error"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="store.error = null"
    >
      {{ store.error }}
    </v-alert>

    <!-- Results Table with Add/Remove buttons -->
    <ConceptTable
      :concepts="store.concepts"
      :loading="store.loading"
      :total-items="store.totalCount"
      :page="store.page"
      :items-per-page="store.itemsPerPage"
      :show-add-button="true"
      :concepts-in-set="conceptsInSet"
      @update:page="onPageChange"
      @update:items-per-page="onItemsPerPageChange"
      @add-concept="onAddConcept"
      @remove-concept="onRemoveConcept"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptSearchStore } from '@/stores/concept-search'
import { useConceptSetsStore } from '@/stores/concept-sets'
import ConceptTable from './ConceptTable.vue'
import type { Concept } from '@/models/concept-set.types'

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
  'add-concept': [concept: Concept]
  'remove-concept': [concept: Concept]
}>()

// ============================================================================
// Local State
// ============================================================================

const searchInput = ref<string>('')

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
  emit('add-concept', concept)
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
