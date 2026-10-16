<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="CONCEPTS"
    :title="tv('search.headingTitle')"
    max-width="1400"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
    @close="close"
  >
    <ConceptSearchInline
      v-if="modelValue"
      selection-mode
      :domain-filter="domainFilter"
      :preselected-concept-ids="preSelectedConcepts.map(concept => concept.conceptId)"
      @selection-complete="selectConcepts"
      @selection-cancelled="close"
    />
  </AtlasDialog>
</template>

<script setup lang="ts">
import { AtlasDialog } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { Concept } from '@/models/concept-set.types'
import ConceptSearchInline from '@/components/concepts/ConceptSearchInline.vue'

interface Props {
  modelValue: boolean
  domainFilter?: string
  preSelectedConcepts?: Concept[]
}

withDefaults(defineProps<Props>(), {
  domainFilter: undefined,
  preSelectedConcepts: () => [],
})
const { tv } = useI18n()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'concepts-selected': [concepts: Concept[]]
}>()

function selectConcepts(concepts: Concept[]) {
  if (concepts.length > 0) {
    emit('concepts-selected', concepts)
  }
  close()
}

function close() {
  emit('update:modelValue', false)
}
</script>
