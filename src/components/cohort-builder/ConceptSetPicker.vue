<template>
  <v-card variant="outlined">
    <v-card-title class="text-subtitle-1">
      {{ t('cs.manager.selectConceptSet', 'Select Concept Set') }}
    </v-card-title>
    <v-card-text>
      <!-- Existing Concept Set Selector -->
      <v-select
        v-model="selectedConceptSetId"
        :items="conceptSetItems"
        item-title="label"
        item-value="value"
        :label="tv('cs.manager.chooseConceptSet', 'Choose Concept Set')"
        clearable
        data-testid="concept-set-selector"
        @update:model-value="handleSelect"
      >
        <template #prepend-item>
          <v-list-item @click="showSearch = true">
            <template #prepend>
              <v-icon>mdi-magnify</v-icon>
            </template>
            <v-list-item-title>{{ t('search.searchConcepts', 'Search for concepts...') }}</v-list-item-title>
          </v-list-item>
          <v-list-item @click="showCreateNew = true">
            <template #prepend>
              <v-icon>mdi-plus</v-icon>
            </template>
            <v-list-item-title>{{ t('cs.manager.createNew', 'Create new concept set...') }}</v-list-item-title>
          </v-list-item>
          <v-divider class="my-2" />
        </template>
      </v-select>

      <!-- Selected Concept Set Display -->
      <v-chip
        v-if="selectedConceptSet"
        closable
        color="primary"
        class="mt-2"
        @click:close="clearSelection"
      >
        {{ selectedConceptSet.name }} ({{ getConceptCount(selectedConceptSet) }} concepts)
      </v-chip>
    </v-card-text>

    <!-- Concept Search Dialog -->
    <v-dialog
      v-model="showSearch"
      max-width="800"
      scrollable
    >
      <ConceptSearch @select-concept="handleConceptSelect" />
    </v-dialog>

    <!-- Create New Concept Set Dialog -->
    <v-dialog
      v-model="showCreateNew"
      max-width="600"
      scrollable
    >
      <ConceptSetEditor
        v-model="newConceptSet"
        @save="handleSaveNew"
        @cancel="showCreateNew = false"
        @add-concepts="openSearchFromEditor"
      />
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptSets } from '@/composables/useConceptSets'
import ConceptSearch from '@/components/concept-sets/ConceptSearch.vue'
import ConceptSetEditor from '@/components/concept-sets/ConceptSetEditor.vue'
import type { ConceptSetReference, ConceptSet, Concept } from '@/models/concept-set.types'

const { t, tv } = useI18n()

interface Props {
  modelValue?: ConceptSetReference
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: ConceptSetReference]
}>()

const {
  conceptSetsList,
  loadAllConceptSets,
  getConceptSet,
  createConceptSet,
  selectedConcepts,
  toggleConceptSelection,
  clearSelectedConcepts,
} = useConceptSets()

const selectedConceptSetId = ref<number | string | undefined>(props.modelValue?.id)
const selectedConceptSet = ref<ConceptSet | null>(null)
const showSearch = ref(false)
const showCreateNew = ref(false)
const newConceptSet = ref<ConceptSet>({
  id: 'new',
  name: '',
  items: [],
})

const conceptSetItems = computed(() => {
  return conceptSetsList.value.map((cs) => ({
    label: `${cs.name} (ID: ${cs.id})`,
    value: cs.id,
  }))
})

async function handleSelect(id: number | string | undefined) {
  if (!id) {
    clearSelection()
    return
  }

  const conceptSet = await getConceptSet(id)
  if (conceptSet && conceptSet.id !== undefined) {
    selectedConceptSet.value = conceptSet
    emit('update:modelValue', {
      id: conceptSet.id,
      name: conceptSet.name,
      conceptCount: conceptSet.items?.length || 0,
    })
  }
}

function clearSelection() {
  selectedConceptSetId.value = undefined
  selectedConceptSet.value = null
  emit('update:modelValue', undefined as any)
}

function handleConceptSelect(concept: Concept) {
  toggleConceptSelection(concept)
}

function openSearchFromEditor() {
  showSearch.value = true
}

async function handleSaveNew() {
  // Add selected concepts to the new concept set
  if (selectedConcepts.value.length > 0) {
    newConceptSet.value.items = selectedConcepts.value.map((concept) => ({
      conceptId: concept.conceptId,
      conceptName: concept.conceptName,
      conceptCode: concept.conceptCode,
      domainId: concept.domainId,
      vocabularyId: concept.vocabularyId,
      conceptClassId: concept.conceptClassId,
      standardConcept: concept.standardConcept,
      invalidReason: concept.invalidReason,
      includeDescendants: true,
      includeMapped: false,
      isExcluded: false,
    }))
  }

  const created = await createConceptSet(newConceptSet.value)

  if (created && created.id !== undefined) {
    selectedConceptSetId.value = created.id
    selectedConceptSet.value = created
    emit('update:modelValue', {
      id: created.id,
      name: created.name,
      conceptCount: created.items?.length || 0,
    })

    // Reset
    newConceptSet.value = {
      id: 'new',
      name: '',
      items: [],
    }
    clearSelectedConcepts()
    showCreateNew.value = false
  }
}

function getConceptCount(conceptSet: ConceptSet): number {
  return conceptSet.items?.length || 0
}

// Load concept sets on mount
onMounted(async () => {
  await loadAllConceptSets()

  // If modelValue is provided, load that concept set
  if (props.modelValue?.id) {
    await handleSelect(props.modelValue.id)
  }
})

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue && newValue.id !== selectedConceptSetId.value) {
      handleSelect(newValue.id)
    } else if (!newValue) {
      clearSelection()
    }
  }
)
</script>
