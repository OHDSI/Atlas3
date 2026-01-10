<template>
  <div class="concept-search">
    <!-- Search Input -->
    <v-card
      flat
      class="mb-4"
    >
      <v-card-text>
        <v-text-field
          v-model="searchInput"
          :label="t('search.headingTitle', 'Search for concepts').value"
          :placeholder="t('search.placeholder', 'Enter at least 3 characters to search...').value"
          prepend-inner-icon="mdi-magnify"
          clearable
          variant="outlined"
          density="comfortable"
          :error-messages="validationError"
          :disabled="loading"
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
              {{ t('search.buttonTitle', 'Search') }}
            </v-btn>
          </template>
        </v-text-field>

        <!-- Search hint -->
        <div class="text-caption text-grey mt-1">
          {{ t('search.vocabulariesInfo', 'Search across SNOMED, ICD, RxNorm, LOINC, and other standard vocabularies') }}
        </div>
      </v-card-text>
    </v-card>

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

    <!-- Results Table -->
    <ConceptTable
      :concepts="store.concepts"
      :loading="store.loading"
      :loading-record-counts="store.loadingRecordCounts"
      :total-items="store.totalCount"
      :page="store.page"
      :items-per-page="store.itemsPerPage"
      @update:page="onPageChange"
      @update:items-per-page="onItemsPerPageChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptSearchStore } from '@/stores/concept-search'
import ConceptTable from './ConceptTable.vue'

const { t } = useI18n()

// ============================================================================
// Store
// ============================================================================

const store = useConceptSearchStore()

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
</script>

<style scoped>
.concept-search {
  width: 100%;
}
</style>
