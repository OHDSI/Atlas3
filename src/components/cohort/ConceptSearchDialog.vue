<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="CONCEPTS"
    :title="tv('search.headingTitle')"
    max-width="800"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
    @close="close"
  >
    <div>
      <AtlasTextField
        v-model="searchQuery"
        :label="tv('common.search')"
        :placeholder="tv('search.placeholder')"
        variant="outlined"
        prepend-icon="mdi-magnify"
        clearable
        @keyup.enter="performSearch"
      />

      <AtlasSelect
        v-model="selectedDomain"
        :label="tv('search.domains')"
        :items="domainOptions"
        variant="outlined"
        clearable
        class="mt-3"
      />

      <div class="d-flex align-center gap-2 mt-3">
        <AtlasButton
          :loading="isSearching"
          :disabled="!searchQuery || searchQuery.length < 2"
          @click="performSearch"
        >
          {{ t('common.search') }}
        </AtlasButton>

        <AtlasSpacer />

        <AtlasButton
          variant="ghost"
          @click="close"
        >
          {{ t('common.cancel') }}
        </AtlasButton>
        <AtlasButton
          :disabled="selectedConcepts.length === 0"
          @click="addSelectedConcepts"
        >
          {{ t('common.add') }} ({{ selectedConcepts.length }})
        </AtlasButton>
      </div>

      <AtlasDivider class="my-4" />

      <div
        v-if="isSearching"
        class="concept-search-loading"
      >
        <AtlasProgressCircular
          color="primary"
          indeterminate
        />
        <p class="text-body-2 mt-2">
          {{ t('components.conceptSearch.searching', 'Searching concepts...').value }}
        </p>
      </div>

      <div v-else-if="searchResults && searchResults.length > 0">
        <p class="text-subtitle-2 mb-2">
          {{ t('components.conceptSearch.foundResults', 'Found {count} results', { count: searchResults.length }).value }}
        </p>

        <v-virtual-scroll
          :items="searchResults"
          height="400"
          item-height="72"
        >
          <template #default="{ item }">
            <AtlasListItem
              :key="item.conceptId"
              @click="selectConcept(item)"
            >
              <template #prepend>
                <v-checkbox-btn :model-value="isSelected(item.conceptId)" />
              </template>

              <v-list-item-title>
                {{ item.conceptName }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{
                  t('components.conceptSearch.conceptMeta', 'ID: {id} | Code: {code} | Domain: {domain}', {
                    id: item.conceptId,
                    code: item.conceptCode,
                    domain: item.domainId,
                  }).value
                }}
              </v-list-item-subtitle>
            </AtlasListItem>
          </template>
        </v-virtual-scroll>
      </div>

      <div
        v-else-if="hasSearched"
        class="text-center text-medium-emphasis py-4"
      >
        <AtlasIcon
          size="48"
          class="mb-2"
        >
          mdi-magnify-remove-outline
        </AtlasIcon>
        <p>{{ t('search.noResultsFoundFor', { query: searchQuery }) }}</p>
      </div>

      <div
        v-else
        class="text-center text-medium-emphasis py-4"
      >
        <AtlasIcon
          size="48"
          class="mb-2"
        >
          mdi-magnify
        </AtlasIcon>
        <p>{{ t('conceptSearch.instructions') }}</p>
      </div>
    </div>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasDivider, AtlasDialog, AtlasIcon, AtlasListItem, AtlasProgressCircular, AtlasSelect, AtlasSpacer, AtlasTextField } from '@/components/ui'
import { ref, computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { Concept } from '@/models/concept-set.types'
import { useConceptPickerStore } from '@/stores/concept-picker'
import { useWebAPIStore } from '@/stores/webapi'
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

const conceptPickerStore = useConceptPickerStore()
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

const isSearching = computed(() => conceptPickerStore.isSearching)
const searchResults = computed(() => {
  const results = conceptPickerStore.searchResults || []

  // Client-side domain filtering
  if (selectedDomain.value && results.length > 0) {
    return results.filter(concept => concept.domainId === selectedDomain.value)
  }

  return results
})

async function performSearch() {
  if (!searchQuery.value || searchQuery.value.length < 2) return

  // Use validated vocabulary source - this checks localStorage and validates against available sources
  const vocabularySource = webapiStore.getValidVocabularySource()
  if (!vocabularySource) {
    logger.error('ConceptSearchDialog', 'No vocabulary source available')
    return
  }

  hasSearched.value = true
  selectedConcepts.value = []

  try {
    // Don't pass domain to API - we filter client-side instead
    await conceptPickerStore.searchConcepts(vocabularySource, searchQuery.value)
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
watch(
  () => props.domainFilter,
  newDomain => {
    selectedDomain.value = newDomain || null
  }
)

// Watch for dialog opening to pre-populate selected concepts
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen && props.preSelectedConcepts) {
      selectedConcepts.value = [...props.preSelectedConcepts]
    }
  }
)
</script>

<style scoped>
.concept-search-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
</style>
