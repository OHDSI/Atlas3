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

    <!-- Results Table -->
    <ConceptTable
      :concepts="store.concepts"
      :loading="store.loading"
      :loading-record-counts="store.loadingRecordCounts"
      :total-items="store.totalCount"
      :page="store.page"
      :items-per-page="store.itemsPerPage"
      :linkable="true"
      :source-key="selectedSourceKey"
      @update:page="onPageChange"
      @update:items-per-page="onItemsPerPageChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { AtlasAlert, AtlasTextField } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useConceptSearchStore } from '@/stores/concept-search'
import { useDataSourcesStore } from '@/stores/datasources'
import ConceptTable from './ConceptTable.vue'

const { t } = useI18n()

// ============================================================================
// Store
// ============================================================================

const store = useConceptSearchStore()
const dataSources = useDataSourcesStore()
const selectedSourceKey = computed(() => dataSources.selectedSource?.sourceKey ?? '')

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

.concept-search__hero {
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
