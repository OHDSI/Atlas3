<template>
  <div class="concept-array d-flex flex-column ga-3">
    <div class="concept-array__toolbar d-flex flex-wrap align-center ga-2">
      <AtlasChip
        v-if="binding?.exclude"
        class="concept-array__exclude-chip"
        :color="binding?.exclude?.value ? 'warning' : 'primary'"
        variant="tonal"
        label
        size="sm"
        @click="toggleExclude"
      >
        {{ binding?.exclude?.value ? notAnyOfLabel : anyOfLabel }}
      </AtlasChip>

      <AtlasButton
        variant="secondary"
        size="sm"
        icon="mdi-plus"
        class="concept-array__select-button"
        @click="openConceptSearch()"
      >
        {{ addConceptsLabel }}
      </AtlasButton>
    </div>

    <div class="concept-array__content d-flex flex-wrap align-center ga-2">
      <AtlasChip
        v-for="concept in selectedConcepts"
        :key="conceptKey(concept)"
        closable
        size="sm"
        tone="primary"
        variant="outlined"
        @click:close="removeConcept(concept.CONCEPT_ID)"
      >
        {{ conceptLabel(concept) }}
      </AtlasChip>

      <span
        v-if="selectedConcepts.length === 0"
        class="text-medium-emphasis text-body-2"
      >
        {{ noConceptsSelectedLabel }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasButton, AtlasChip } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { Concept } from '@/models/circe-types'
import type { ConceptArrayBinding } from '../criteria/criteria-editor.types'
import { useCriteriaSelection } from '@/composables/useCriteriaSelection'

const { t } = useI18n()

const props = defineProps<{
  binding?: ConceptArrayBinding
  modelValue?: Concept[]
  domainFilter?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Concept[] | undefined]
}>()

const criteriaSelection = useCriteriaSelection()

function openConceptSearch() {
  criteriaSelection?.requestConcepts(props.domainFilter, applySelectedConcepts)
}

const anyOfLabel = computed(() => t('components.conceptAddBox.anyOf', 'any of').value)
const notAnyOfLabel = computed(() => t('components.conceptAddBox.notAnyOf', 'not any of').value)
const addConceptsLabel = computed(() => t('components.conceptAddBox.addConcepts', 'Add Concepts').value)
const noConceptsSelectedLabel = computed(() => t('components.conceptAddBox.noConceptsSelected', 'No concepts selected').value)

const selectedConcepts = computed(() => (props.binding ? props.binding.concepts.value : props.modelValue) || [])

function conceptKey(concept: Concept): string {
  return String(concept.CONCEPT_ID ?? '')
}

function conceptLabel(concept: Concept): string {
  if (concept.CONCEPT_NAME) {
    return `${concept.CONCEPT_ID} - ${concept.CONCEPT_NAME}`
  }
  return `Concept ${concept.CONCEPT_ID ?? ''}`.trim()
}

function applySelectedConcepts(concepts: Concept[]) {
  const merged = mergeConcepts(selectedConcepts.value, concepts)

  if (props.binding) {
    props.binding.concepts.value = merged.length > 0 ? merged : undefined
    return
  }

  emit('update:modelValue', merged.length > 0 ? merged : undefined)
}

function setExclude(value: boolean) {
  if (props.binding?.exclude) {
    props.binding.exclude.value = value
  }
}

function toggleExclude() {
  if (!props.binding?.exclude) return
  setExclude(!(props.binding.exclude.value ?? false))
}

function removeConcept(conceptId: number | undefined) {
  const filtered = selectedConcepts.value.filter(concept => concept.CONCEPT_ID !== conceptId)

  if (props.binding) {
    props.binding.concepts.value = filtered.length > 0 ? filtered : undefined
    return
  }

  emit('update:modelValue', filtered.length > 0 ? filtered : undefined)
}

function mergeConcepts(existingConcepts: Concept[], newConcepts: Concept[]) {
  const merged = [...existingConcepts]
  const seen = new Set(existingConcepts.map(concept => concept.CONCEPT_ID).filter((conceptId): conceptId is number => typeof conceptId === 'number'))

  for (const concept of newConcepts) {
    const conceptId = concept.CONCEPT_ID
    if (typeof conceptId !== 'number' || seen.has(conceptId)) continue
    merged.push(concept)
    seen.add(conceptId)
  }

  return merged
}
</script>

<style scoped>
.concept-array__content {
  min-height: 40px;
}

.concept-array__exclude-chip {
  cursor: pointer;
  text-transform: none;
}

.concept-array__select-button {
  flex: 0 0 auto;
  white-space: nowrap;
}
</style>
