<template>
  <v-card variant="outlined">
    <v-card-title class="text-subtitle-1">
      {{
        singleSelect
          ? t('components.conceptPicker.selectConcept', 'Select Concept')
          : t('components.conceptAddBox.selectConceptSet', 'Select Concept Set')
      }}
    </v-card-title>
    <v-card-text>
      <!-- Single Concept Selection Mode -->
      <template v-if="singleSelect">
        <v-text-field
          :model-value="selectedConcept?.CONCEPT_NAME || ''"
          readonly
          :label="tv('components.conceptPicker.selectConcept', 'Selected Concept')"
          :placeholder="tv('search.placeholder', 'Click search to select...')"
          variant="outlined"
          density="compact"
          data-testid="single-concept-display"
        >
          <template #append>
            <AtlasIconButton
              icon="mdi-magnify"
              size="sm"
              variant="text"
              v-bind="{ ariaLabel: 'Search concepts' }"
              @click="showSearch = true"
            />
            <AtlasIconButton
              v-if="selectedConcept"
              icon="mdi-close"
              size="sm"
              variant="text"
              v-bind="{ ariaLabel: 'Clear selection' }"
              @click="clearSingleConceptSelection"
            />
          </template>
        </v-text-field>

        <!-- Selected Concept Chip -->
        <AtlasChip
          v-if="selectedConcept"
          closable
          tone="primary"
          class="mt-2"
          @close="clearSingleConceptSelection"
        >
          {{ selectedConcept?.CONCEPT_NAME }} (ID: {{ selectedConcept?.CONCEPT_ID }})
        </AtlasChip>
      </template>

      <!-- Concept Set Selection Mode (Default) -->
      <template v-else>
        <AtlasSelect
          v-model="selectedConceptSetId"
          :items="conceptSetItems"
          item-title="label"
          item-value="value"
          :label="tv('components.conceptAddBox.selectConceptSet', 'Choose Concept Set')"
          clearable
          data-testid="concept-set-selector"
          @update:model-value="(v: unknown) => handleSelect(v as number | string | undefined)"
        >
          <template #prepend-item>
            <AtlasListItem @click="showSearch = true">
              <template #prepend>
                <AtlasIcon>mdi-magnify</AtlasIcon>
              </template>
              <v-list-item-title>
                {{
                  t(
                    'components.conceptSet.import.sourceCodes.searchConcepts',
                    'Search for concepts...'
                  )
                }}
              </v-list-item-title>
            </AtlasListItem>
            <AtlasListItem @click="showCreateNew = true">
              <template #prepend>
                <AtlasIcon>mdi-plus</AtlasIcon>
              </template>
              <v-list-item-title>
                {{
                  t('common.create', 'Create new concept set...')
                }}
              </v-list-item-title>
            </AtlasListItem>
            <AtlasDivider class="my-2" />
          </template>
        </AtlasSelect>

        <!-- Selected Concept Set Display -->
        <AtlasChip
          v-if="selectedConceptSet"
          closable
          tone="primary"
          class="mt-2"
          @close="clearSelection"
        >
          {{ selectedConceptSet.name }} ({{ getConceptCount(selectedConceptSet) }} concepts)
        </AtlasChip>
      </template>
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
import { AtlasChip, AtlasDivider, AtlasIcon, AtlasIconButton, AtlasListItem, AtlasSelect } from '@/components/ui'
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptSets } from '@/composables/useConceptSets'
import ConceptSearch from '@/components/concept-sets/ConceptSearch.vue'
import ConceptSetEditor from '@/components/concept-sets/ConceptSetEditor.vue'
import type { ConceptSetReference, ConceptSet, Concept } from '@/models/concept-set.types'
import type { Concept as EventConcept } from '@/models/event.types'

const { t, tv } = useI18n()

interface Props {
  modelValue?: ConceptSetReference | Concept | EventConcept
  singleSelect?: boolean
  domain?: string // Optional domain filter for single concept selection
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  singleSelect: false,
  domain: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: ConceptSetReference | Concept | EventConcept | undefined]
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

// State for concept set mode
const selectedConceptSetId = ref<number | string | undefined>(
  !props.singleSelect && props.modelValue && 'id' in props.modelValue
    ? props.modelValue.id
    : undefined
)
const selectedConceptSet = ref<ConceptSet | null>(null)

// State for single concept mode (using event.types.ts Concept format)
const selectedConcept = ref<import('@/models/event.types').Concept | null>(
  props.singleSelect && props.modelValue && 'CONCEPT_ID' in props.modelValue
    ? (props.modelValue as unknown as import('@/models/event.types').Concept)
    : null
)

const showSearch = ref(false)
const showCreateNew = ref(false)
const newConceptSet = ref<ConceptSet>({
  id: 'new',
  name: '',
  items: [],
})

const conceptSetItems = computed(() => {
  return conceptSetsList.value.map(cs => ({
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
  emit('update:modelValue', undefined)
}

function handleConceptSelect(concept: Concept) {
  if (props.singleSelect) {
    // Single concept mode: select and emit the concept directly
    // Map from internal Concept type to event.types.ts Concept format
    const mappedConcept: import('@/models/event.types').Concept = {
      CONCEPT_ID: concept.conceptId,
      CONCEPT_NAME: concept.conceptName,
      CONCEPT_CODE: concept.conceptCode,
      DOMAIN_ID: concept.domainId,
      VOCABULARY_ID: concept.vocabularyId,
      CONCEPT_CLASS_ID: concept.conceptClassId,
      STANDARD_CONCEPT: concept.standardConcept || undefined,
      INVALID_REASON: concept.invalidReason || undefined,
    }
    selectedConcept.value = mappedConcept
    emit('update:modelValue', mappedConcept)
    showSearch.value = false
  } else {
    // Concept set mode: add to selection for creating new set
    toggleConceptSelection(concept)
  }
}

function clearSingleConceptSelection() {
  selectedConcept.value = null
  emit('update:modelValue', undefined)
}

function openSearchFromEditor() {
  showSearch.value = true
}

async function handleSaveNew() {
  // Add selected concepts to the new concept set
  if (selectedConcepts.value.length > 0) {
    newConceptSet.value.items = selectedConcepts.value.map(concept => ({
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

  // If modelValue is provided and is a ConceptSetReference, load that concept set
  if (props.modelValue && 'id' in props.modelValue && props.modelValue.id) {
    await handleSelect(props.modelValue.id)
  }
})

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  newValue => {
    if (props.singleSelect) {
      // Handle single concept mode
      if (newValue && 'CONCEPT_ID' in newValue) {
        selectedConcept.value = newValue as unknown as import('@/models/event.types').Concept
      } else {
        selectedConcept.value = null
      }
    } else {
      // Handle concept set mode
      if (newValue && 'id' in newValue && newValue.id !== selectedConceptSetId.value) {
        handleSelect(newValue.id)
      } else if (!newValue) {
        clearSelection()
      }
    }
  }
)
</script>
