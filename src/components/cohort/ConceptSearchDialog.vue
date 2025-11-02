<template>
  <v-dialog
    :model-value="modelValue"
    max-width="800"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-magnify</v-icon>
        <span>Search Concepts</span>
        <v-spacer />
        <v-btn
          icon
          size="small"
          variant="text"
          @click="close"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-text-field
          v-model="searchQuery"
          label="Search concepts"
          placeholder="Enter search term..."
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-magnify"
          clearable
          @keyup.enter="performSearch"
        />

        <v-select
          v-model="selectedDomain"
          label="Domain (optional)"
          :items="domainOptions"
          variant="outlined"
          density="comfortable"
          clearable
          class="mt-3"
        />

        <v-btn
          color="primary"
          :loading="isSearching"
          :disabled="!searchQuery || searchQuery.length < 2"
          class="mt-3"
          @click="performSearch"
        >
          Search
        </v-btn>

        <v-divider class="my-4" />

        <loading-spinner
          v-if="isSearching"
          message="Searching concepts..."
        />

        <div v-else-if="searchResults.length > 0">
          <p class="text-subtitle-2 mb-2">
            Found {{ searchResults.length }} concept{{ searchResults.length === 1 ? '' : 's' }}
          </p>

          <v-list>
            <v-list-item
              v-for="concept in searchResults"
              :key="concept.conceptId"
              @click="selectConcept(concept)"
            >
              <template #prepend>
                <v-checkbox-btn :model-value="isSelected(concept.conceptId)" />
              </template>

              <v-list-item-title>{{ concept.conceptName }}</v-list-item-title>
              <v-list-item-subtitle>
                ID: {{ concept.conceptId }} | Code: {{ concept.conceptCode }} | Domain: {{ concept.domainId }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </div>

        <div v-else-if="hasSearched" class="text-center text-medium-emphasis py-4">
          <v-icon size="48" class="mb-2">mdi-magnify-remove-outline</v-icon>
          <p>No concepts found</p>
        </div>

        <div v-else class="text-center text-medium-emphasis py-4">
          <v-icon size="48" class="mb-2">mdi-magnify</v-icon>
          <p>Enter a search term to find concepts</p>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="close"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          :disabled="selectedConcepts.length === 0"
          @click="addSelectedConcepts"
        >
          Add {{ selectedConcepts.length }} Concept{{ selectedConcepts.length === 1 ? '' : 's' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Concept } from '@/models/concept-set.types'
import { useConceptSetsStore } from '@/stores/conceptSets'
import { useWebAPIStore } from '@/stores/webapi'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'

interface Props {
  modelValue: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'concepts-selected': [concepts: Concept[]]
}>()

const conceptSetsStore = useConceptSetsStore()
const webapiStore = useWebAPIStore()

const searchQuery = ref('')
const selectedDomain = ref<string | null>(null)
const selectedConcepts = ref<Concept[]>([])
const hasSearched = ref(false)

const domainOptions = [
  'Condition',
  'Drug',
  'Procedure',
  'Observation',
  'Measurement',
  'Visit',
  'Device',
]

const isSearching = computed(() => conceptSetsStore.isSearching)
const searchResults = computed(() => conceptSetsStore.searchResults)

async function performSearch() {
  if (!searchQuery.value || searchQuery.value.length < 2) return
  if (!webapiStore.selectedSource) {
    console.error('No CDM source selected')
    return
  }

  hasSearched.value = true
  selectedConcepts.value = []

  await conceptSetsStore.searchConcepts(
    webapiStore.selectedSource,
    searchQuery.value,
    selectedDomain.value ?? undefined
  )
}

function isSelected(conceptId: number): boolean {
  return selectedConcepts.value.some(c => c.conceptId === conceptId)
}

function selectConcept(concept: Concept) {
  const index = selectedConcepts.value.findIndex(c => c.conceptId === concept.conceptId)

  if (index >= 0) {
    selectedConcepts.value.splice(index, 1)
  } else {
    selectedConcepts.value.push(concept)
  }
}

function addSelectedConcepts() {
  if (selectedConcepts.value.length > 0) {
    emit('concepts-selected', [...selectedConcepts.value])
  }
  close()
}

function close() {
  emit('update:modelValue', false)
  // Reset state
  searchQuery.value = ''
  selectedDomain.value = null
  selectedConcepts.value = []
  hasSearched.value = false
}
</script>
