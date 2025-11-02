<template>
  <v-card>
    <v-card-title>Search OHDSI Vocabulary</v-card-title>
    <v-card-text>
      <!-- Search Input -->
      <v-text-field
        v-model="searchQuery"
        label="Search Concepts"
        placeholder="Enter concept name (e.g., diabetes, metformin)"
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
        label="Filter by Domain"
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
              ID: {{ item.conceptId }} | Domain: {{ item.domainId }} | Vocabulary: {{ item.vocabularyId }}
            </v-list-item-subtitle>
            <v-list-item-subtitle>
              Code: {{ item.conceptCode }} | Class: {{ item.conceptClassId }}
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
        No concepts found for "{{ searchQuery }}"
      </v-alert>

      <!-- Instructions -->
      <v-alert
        v-if="!searchQuery && searchResults.length === 0"
        type="info"
        variant="text"
      >
        Enter a search term to find concepts in the OHDSI vocabulary
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useConceptSets } from '@/composables/useConceptSets'
import type { Concept } from '@/models/concept-set.types'

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
