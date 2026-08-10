<template>
  <AtlasDialog
    :model-value="modelValue"
    max-width="920"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card rounded="lg">
      <v-card-title class="d-flex flex-column align-start ga-1">
        <span class="text-eyebrow">VOCABULARY</span>
        <span class="text-h6">Select concepts</span>
      </v-card-title>

      <v-card-text class="d-flex flex-column ga-4">
        <AtlasAlert
          variant="tonal"
          type="info"
          density="compact"
        >
          Mock vocabulary search results. Click rows to select concepts, then add them back to the attribute.
        </AtlasAlert>

        <AtlasDataTable
          :headers="headers"
          :items="mockResults"
          hover
          hide-default-footer
          :items-per-page="mockResults.length"
          @click:row="onRowClick"
        >
          <template #item.pick="{ item }">
            <AtlasCheckbox :model-value="isSelected(item.CONCEPT_ID)" />
          </template>

          <template #item.CONCEPT_NAME="{ item }">
            <div class="font-weight-medium">
              {{ item.CONCEPT_NAME }}
            </div>
          </template>
        </AtlasDataTable>
      </v-card-text>

      <v-card-actions>
        <div class="text-caption text-medium-emphasis px-2">
          {{ selectedConcepts.length }} selected
        </div>
        <AtlasSpacer />
        <AtlasButton
          variant="tonal"
          @click="close"
        >
          Cancel
        </AtlasButton>
        <AtlasButton
          color="primary"
          :disabled="selectedConcepts.length === 0"
          @click="confirmSelection"
        >
          Add selected
        </AtlasButton>
      </v-card-actions>
    </v-card>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AtlasAlert,
  AtlasButton,
  AtlasCheckbox,
  AtlasDataTable,
  AtlasDialog,
  AtlasSpacer,
} from '@/components/ui'
import type { Concept } from './circe.types'

const props = defineProps<{
  modelValue: boolean
  preSelectedConcepts?: Concept[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  selected: [concepts: Concept[]]
}>()

const mockResults = [
  { CONCEPT_ID: 201826, CONCEPT_NAME: 'Hypertension', DOMAIN_ID: 'Condition', VOCABULARY_ID: 'SNOMED' },
  { CONCEPT_ID: 302056, CONCEPT_NAME: 'Type 2 diabetes mellitus', DOMAIN_ID: 'Condition', VOCABULARY_ID: 'SNOMED' },
  { CONCEPT_ID: 401200, CONCEPT_NAME: 'Metformin', DOMAIN_ID: 'Drug', VOCABULARY_ID: 'RxNorm' },
  { CONCEPT_ID: 502310, CONCEPT_NAME: 'Body mass index', DOMAIN_ID: 'Measurement', VOCABULARY_ID: 'SNOMED' },
  { CONCEPT_ID: 603410, CONCEPT_NAME: 'Smoking status', DOMAIN_ID: 'Observation', VOCABULARY_ID: 'SNOMED' },
  { CONCEPT_ID: 704520, CONCEPT_NAME: 'Outpatient visit', DOMAIN_ID: 'Visit', VOCABULARY_ID: 'Visit' },
] satisfies Concept[]

const headers = [
  { key: 'pick', title: 'Pick', sortable: false, width: 56 },
  { key: 'CONCEPT_NAME', title: 'Concept' },
  { key: 'CONCEPT_ID', title: 'ID', width: 110 },
  { key: 'DOMAIN_ID', title: 'Domain', width: 120 },
  { key: 'VOCABULARY_ID', title: 'Vocabulary', width: 120 },
]

const selectedConcepts = ref<Concept[]>([])

const selectedIds = computed(() => new Set(selectedConcepts.value.map(concept => concept.CONCEPT_ID).filter((conceptId): conceptId is number => typeof conceptId === 'number')))

function isSelected(conceptId: number | undefined) {
  return typeof conceptId === 'number' && selectedIds.value.has(conceptId)
}

function toggleConcept(concept: Concept) {
  const conceptId = concept.CONCEPT_ID
  if (typeof conceptId !== 'number') return

  if (isSelected(conceptId)) {
    selectedConcepts.value = selectedConcepts.value.filter(item => item.CONCEPT_ID !== conceptId)
    return
  }

  selectedConcepts.value = [...selectedConcepts.value, concept]
}

function onRowClick(_event: Event, payload: { item: Concept }) {
  toggleConcept(payload.item)
}

function confirmSelection() {
  emit('selected', [...selectedConcepts.value])
  close()
}

function close() {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      selectedConcepts.value = [...(props.preSelectedConcepts || [])]
    } else {
      selectedConcepts.value = []
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.concept-row {
  cursor: pointer;
}

.concept-row:hover {
  background: rgba(var(--v-theme-primary), 0.05);
}
</style>