<template>
  <v-dialog
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
        <v-alert
          variant="tonal"
          type="info"
          density="compact"
        >
          Mock vocabulary search results. Click rows to select concepts, then add them back to the attribute.
        </v-alert>

        <v-table density="compact">
          <thead>
            <tr>
              <th
                class="text-left"
                style="width: 56px"
              >
                Pick
              </th>
              <th class="text-left">
                Concept
              </th>
              <th
                class="text-left"
                style="width: 110px"
              >
                ID
              </th>
              <th
                class="text-left"
                style="width: 120px"
              >
                Domain
              </th>
              <th
                class="text-left"
                style="width: 120px"
              >
                Vocabulary
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="concept in mockResults"
              :key="concept.CONCEPT_ID"
              class="concept-row"
              @click="toggleConcept(concept)"
            >
              <td>
                <v-checkbox-btn :model-value="isSelected(concept.CONCEPT_ID)" />
              </td>
              <td>
                <div class="font-weight-medium">
                  {{ concept.CONCEPT_NAME }}
                </div>
              </td>
              <td>{{ concept.CONCEPT_ID }}</td>
              <td>{{ concept.DOMAIN_ID }}</td>
              <td>{{ concept.VOCABULARY_ID }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>

      <v-card-actions>
        <div class="text-caption text-medium-emphasis px-2">
          {{ selectedConcepts.length }} selected
        </div>
        <v-spacer />
        <v-btn
          variant="tonal"
          @click="close"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          :disabled="selectedConcepts.length === 0"
          @click="confirmSelection"
        >
          Add selected
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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