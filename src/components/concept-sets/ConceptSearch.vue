<template>
  <v-card>
    <v-card-title>{{ t('components.conceptPicker.selectConcept') }}</v-card-title>
    <v-card-text>
      <!-- Search Input -->
      <AtlasTextField
        v-model="searchQuery"
        :label="tv('components.conceptPicker.search')"
        :placeholder="tv('search.placeholder')"
        prepend-icon="mdi-magnify"
        clearable
        data-testid="concept-search-input"
        @update:model-value="(v) => handleSearch(v as string | null)"
        @click:clear="handleClear"
      />

      <!-- Domain Filter -->
      <AtlasSelect
        v-model="selectedDomain"
        :items="domains"
        :label="tv('search.domains')"
        clearable
        data-testid="domain-filter"
        @update:model-value="handleDomainChange"
      />

      <!-- Loading Indicator -->
      <AtlasProgressLinear
        v-if="isSearching"
        indeterminate
        color="primary"
        data-testid="search-loading"
      />

      <!-- Search Results -->
      <v-virtual-scroll
        v-if="searchResults && searchResults.length > 0"
        :items="searchResults"
        height="400"
        item-height="80"
        data-testid="search-results-list"
      >
        <template #default="{ item }">
          <AtlasListItem
            :data-testid="`concept-item-${item.conceptId}`"
            @click="$emit('select-concept', item)"
          >
            <v-list-item-title>
              {{ item.conceptName }}
            </v-list-item-title>
            <v-list-item-subtitle>
              ID: {{ item.conceptId }} | Domain: {{ item.domainId }} | Vocabulary:
              {{ item.vocabularyId }}
            </v-list-item-subtitle>
            <v-list-item-subtitle>
              Code: {{ item.conceptCode }} | Class: {{ item.conceptClassId }}
            </v-list-item-subtitle>
          </AtlasListItem>
          <AtlasDivider />
        </template>
      </v-virtual-scroll>

      <!-- No Results Message -->
      <AtlasAlert
        v-if="searchQuery && !isSearching && searchResults && searchResults.length === 0"
        severity="info"
        data-testid="no-results-message"
      >
        {{ t('search.noResultsFoundFor') }} "{{ searchQuery }}"
      </AtlasAlert>

      <AtlasAlert
        v-if="!searchQuery && (!searchResults || searchResults.length === 0)"
        severity="info"
        variant="flat"
      >
        {{ t('components.conceptSearch.enterSearchTerm', 'Enter a search term to find concepts').value }}
      </AtlasAlert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasDivider, AtlasListItem, AtlasProgressLinear, AtlasSelect, AtlasTextField } from '@/components/ui'
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptSets } from '@/composables/useConceptSets'
import type { Concept } from '@/models/concept-set.types'

const { t, tv } = useI18n()

defineEmits<{
  'select-concept': [concept: Concept]
}>()

const { searchConcepts, searchResults, isSearching } = useConceptSets()

const searchQuery = ref('')
const selectedDomain = ref<string | undefined>(undefined)

const domains = [
  'Condition',
  'Drug',
  'Gender',
  'Measurement',
  'Observation',
  'Device',
  'Procedure',
  'Race',
  'Specimen',
  'Visit',
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
