<template>
  <v-card>
    <v-card-title>{{ t('conceptSearch.title') }}</v-card-title>
    <v-card-text>
      <!-- Search Input -->
      <v-text-field
        v-model="searchQuery"
        :label="tv('conceptSearch.searchLabel')"
        :placeholder="tv('conceptSearch.searchPlaceholder')"
        prepend-inner-icon="mdi-magnify"
        clearable
        data-testid="concept-search-input"
        @update:model-value="handleSearch"
        @click:clear="handleClear"
      />

      <!-- Domain Filter -->
      <v-select
        v-model="selectedDomain"
        :items="domains"
        :label="tv('conceptSearch.filterByDomain')"
        clearable
        data-testid="domain-filter"
        @update:model-value="handleDomainChange"
      />

      <!-- Loading Indicator -->
      <v-progress-linear
        v-if="isSearching"
        indeterminate
        color="primary"
        data-testid="search-loading"
      />

      <!-- Search Results -->
      <v-virtual-scroll
        v-if="searchResults.length > 0"
        :items="searchResults"
        height="400"
        item-height="80"
        data-testid="search-results-list"
      >
        <template #default="{ item }">
          <v-list-item
            :data-testid="`concept-item-${item.conceptId}`"
            @click="$emit('select-concept', item)"
          >
            <v-list-item-title>
              {{ item.conceptName }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ t('conceptSearch.conceptInfo', { 
                id: item.conceptId, 
                domain: item.domainId, 
                vocabulary: item.vocabularyId 
              }) }}
            </v-list-item-subtitle>
            <v-list-item-subtitle>
              {{ t('conceptSearch.conceptDetails', { 
                code: item.conceptCode, 
                class: item.conceptClassId 
              }) }}
            </v-list-item-subtitle>
          </v-list-item>
          <v-divider />
        </template>
      </v-virtual-scroll>

      <!-- No Results Message -->
      <v-alert
        v-if="searchQuery && !isSearching && searchResults.length === 0"
        type="info"
        variant="tonal"
        data-testid="no-results-message"
      >
        {{ t('conceptSearch.noResults', { query: searchQuery }) }}
      </v-alert>

      <!-- Instructions -->
      <v-alert
        v-if="!searchQuery && searchResults.length === 0"
        type="info"
        variant="text"
      >
        {{ t('conceptSearch.instructions') }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptSets } from '@/composables/useConceptSets'
import type { Concept } from '@/models/concept-set.types'

const { t, tv } = useI18n()

const emit = defineEmits<{
  'select-concept': [concept: Concept]
}>()

const { searchConcepts, searchResults, isSearching } = useConceptSets()

const searchQuery = ref('')
const selectedDomain = ref<string | undefined>(undefined)

const domains = [
  'Condition',
  'Drug',
  'Procedure',
  'Measurement',
  'Observation',
  'Device',
  'Visit',
  'Specimen',
]

function handleSearch(query: string | null) {
  if (query && query.trim().length > 0) {
    searchConcepts(query, selectedDomain.value)
  }
}

function handleDomainChange() {
  if (searchQuery.value && searchQuery.value.trim().length > 0) {
    searchConcepts(searchQuery.value, selectedDomain.value)
  }
}

function handleClear() {
  searchQuery.value = ''
  selectedDomain.value = undefined
}
</script>
