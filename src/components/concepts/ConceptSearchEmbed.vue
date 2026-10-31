<template>
  <div class="concept-search-embed">
    <ConceptSearch
      ref="search"
      :store="store"
      search-variant="embedded"
      linkable
      :domain-filter="domainFilter"
      :preselected-concept-ids="preselectedConceptIds"
      :selection-mode="selectionMode"
      :concepts-in-set="conceptsInSet"
      @add-concept="(concept, flags) => emit('add-concept', concept, flags)"
      @add-concepts="(concepts, flags) => emit('add-concepts', concepts, flags)"
      @remove-concept="concept => emit('remove-concept', concept)"
      @view-concept="payload => emit('view-concept', payload)"
      @selection-complete="concepts => emit('selection-complete', concepts)"
      @selection-cancelled="emit('selection-cancelled')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConceptPickerSearchStore, useConceptSetSearchStore } from '@/stores/concept-search'
import { useConceptSetsStore } from '@/stores/concept-sets'
import ConceptSearch from './ConceptSearch.vue'
import type { Concept, ConceptAddFlags } from '@/models/concept-set.types'

const props = withDefaults(defineProps<{
  selectionMode?: boolean
  domainFilter?: string
  preselectedConceptIds?: number[]
}>(), {
  selectionMode: false,
  domainFilter: undefined,
  preselectedConceptIds: () => [],
})

const emit = defineEmits<{
  'add-concept': [concept: Concept, flags: Required<ConceptAddFlags>]
  'add-concepts': [concepts: Concept[], flags: Required<ConceptAddFlags>]
  'remove-concept': [concept: Concept]
  'view-concept': [payload: { conceptId: number; sourceKey: string }]
  'selection-complete': [concepts: Concept[]]
  'selection-cancelled': []
}>()

const store = props.selectionMode
  ? useConceptPickerSearchStore()
  : useConceptSetSearchStore()
const conceptSetsStore = useConceptSetsStore()
const search = ref<InstanceType<typeof ConceptSearch>>()
const conceptsInSet = computed(() => {
  const ids = new Set<number>()
  conceptSetsStore.currentSet?.items.forEach(item => ids.add(item.conceptId))
  return ids
})

function onSearch() {
  return search.value?.onSearch()
}

defineExpose({ onSearch })
</script>

<style scoped>
.concept-search-embed {
  width: 100%;
  padding-top: 8px;
}
</style>
