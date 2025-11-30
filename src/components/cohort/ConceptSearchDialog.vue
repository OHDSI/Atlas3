<template>
  <v-dialog
    :model-value="modelValue"
    max-width="800"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">
          mdi-magnify
        </v-icon>
        <span>{{ tv('conceptSearch.title') }}</span>
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
          :label="tv('conceptSearch.searchLabel')"
          :placeholder="tv('conceptSearch.searchPlaceholder')"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-magnify"
          clearable
          @keyup.enter="performSearch"
        />

        <v-select
          v-model="selectedDomain"
          :label="tv('conceptSearch.filterByDomain')"
          :items="domainOptions"
          variant="outlined"
          density="comfortable"
          clearable
          class="mt-3"
        />

        <div class="d-flex align-center gap-2 mt-3">
          <v-btn
            color="primary"
            :loading="isSearching"
            :disabled="!searchQuery || searchQuery.length < 2"
            @click="performSearch"
          >
            {{ t('common.search') }}
          </v-btn>

          <v-spacer />

          <v-btn
            variant="text"
            @click="close"
          >
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            :disabled="selectedConcepts.length === 0"
            @click="addSelectedConcepts"
          >
            {{ t('common.add') }} ({{ selectedConcepts.length }})
          </v-btn>
        </div>

        <v-divider class="my-4" />

        <loading-spinner
          v-if="isSearching"
          message="Searching concepts..."
        />

        <div v-else-if="searchResults && searchResults.length > 0">
          <p class="text-subtitle-2 mb-2">
            Found {{ searchResults.length }} results
          </p>

          <v-virtual-scroll
            :items="searchResults"
            height="400"
            item-height="72"
          >
            <template #default="{ item }">
              <v-list-item
                :key="item.conceptId"
                @click="selectConcept(item)"
              >
                <template #prepend>
                  <v-checkbox-btn :model-value="isSelected(item.conceptId)" />
                </template>

                <v-list-item-title>{{ item.conceptName }}</v-list-item-title>
                <v-list-item-subtitle>
                  ID: {{ item.conceptId }} | Code: {{ item.conceptCode }} | Domain: {{ item.domainId }}
                </v-list-item-subtitle>
              </v-list-item>
            </template>
          </v-virtual-scroll>
        </div>

        <div
          v-else-if="hasSearched"
          class="text-center text-medium-emphasis py-4"
        >
          <v-icon
            size="48"
            class="mb-2"
          >
            mdi-magnify-remove-outline
          </v-icon>
          <p>{{ t('conceptSearch.noResults', { query: searchQuery }) }}</p>
        </div>

        <div
          v-else
          class="text-center text-medium-emphasis py-4"
        >
          <v-icon
            size="48"
            class="mb-2"
          >
            mdi-magnify
          </v-icon>
          <p>{{ t('conceptSearch.instructions') }}</p>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { Concept } from '@/models/concept-set.types'
import { useConceptSetsStore } from '@/stores/conceptSets'
import { useWebAPIStore } from '@/stores/webapi'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import { logger } from '@/utils/logger'

interface Props {
  modelValue: boolean
  domainFilter?: string
  preSelectedConcepts?: Concept[]
}

const props = defineProps<Props>()
const { t, tv } = useI18n()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'concepts-selected': [concepts: Concept[]]
}>()

const conceptSetsStore = useConceptSetsStore()
const webapiStore = useWebAPIStore()

const searchQuery = ref('')
const selectedDomain = ref<string | null>(props.domainFilter || null)
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
const searchResults = computed(() => {
  const results = conceptSetsStore.searchResults || []

  // Client-side domain filtering
  if (selectedDomain.value && results.length > 0) {
    return results.filter(concept => concept.domainId === selectedDomain.value)
  }

  return results
})

async function performSearch() {
  if (!searchQuery.value || searchQuery.value.length < 2) return
  if (!webapiStore.selectedSource) {
    logger.error('ConceptSearchDialog', 'No CDM source selected')
    return
  }

  hasSearched.value = true
  selectedConcepts.value = []

  try {
    // Don't pass domain to API - we filter client-side instead
    await conceptSetsStore.searchConcepts(
      webapiStore.selectedSource,
      searchQuery.value
    )
  } catch (error) {
    logger.error('ConceptSearchDialog', 'Search failed', error)
  }
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
  selectedDomain.value = props.domainFilter || null
  selectedConcepts.value = []
  hasSearched.value = false
}

// Watch for domainFilter changes when dialog opens
watch(() => props.domainFilter, (newDomain) => {
  selectedDomain.value = newDomain || null
})

// Watch for dialog opening to pre-populate selected concepts
watch(() => props.modelValue, (isOpen) => {
  if (isOpen && props.preSelectedConcepts) {
    selectedConcepts.value = [...props.preSelectedConcepts]
  }
})
</script>
