<template>
  <div class="concept-search-page">
    <ConceptSearch
      :store="store"
      search-variant="page"
      :initial-search-term="routeQuery"
      :concepts-in-set="conceptsInSet"
      linkable
      :source-key="selectedSourceKey"
      @add-concept="onAddConcept"
      @add-concepts="onAddConcepts"
      @remove-concept="onRemoveConcept"
    />

    <AtlasSnackbar
      v-model="feedback.open"
      severity="success"
      :text="feedback.text"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { routeLocationKey, useRouter } from 'vue-router'
import { AtlasSnackbar } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useConceptSearchStore } from '@/stores/concept-search'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useWebAPIStore } from '@/stores/webapi'
import { getSourceKey } from '@/config/webapi'
import ConceptSearch from './ConceptSearch.vue'
import type { Concept, ConceptAddFlags } from '@/models/concept-set.types'

const { t } = useI18n()
const route = inject(routeLocationKey, null)
const router = useRouter()
const store = useConceptSearchStore()
const conceptSetsStore = useConceptSetsStore()
const webapiStore = useWebAPIStore()
const feedback = ref({ open: false, text: '' })

function routeQueryValue(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

const routeQuery = computed(() => routeQueryValue(route?.query.query))
const selectedSourceKey = computed(
  () => webapiStore.getValidVocabularySource() || getSourceKey() || ''
)
const conceptsInSet = computed(() => {
  const ids = new Set<number>()
  conceptSetsStore.currentSet?.items.forEach(item => ids.add(item.conceptId))
  return ids
})

function onAddConcept(concept: Concept, flags: Required<ConceptAddFlags>) {
  const createdDraft = ensureConceptSetDraft()
  conceptSetsStore.addConceptToSet(concept, flags)
  feedback.value = {
    open: true,
    text: t('search.addedToSet', { concept: concept.conceptName, set: currentSetName() }).value,
  }
  if (createdDraft) navigateToNewConceptSet()
}

function onAddConcepts(concepts: Concept[], flags: Required<ConceptAddFlags>) {
  if (!concepts.length) return
  const createdDraft = ensureConceptSetDraft()
  const before = conceptSetsStore.currentSet?.items.length ?? 0
  concepts.forEach(concept => conceptSetsStore.addConceptToSet(concept, flags))
  const count = (conceptSetsStore.currentSet?.items.length ?? 0) - before
  feedback.value = {
    open: true,
    text: t('search.addedCountToSet', { count, set: currentSetName() }).value,
  }
  if (createdDraft) navigateToNewConceptSet()
}

function onRemoveConcept(concept: Concept) {
  conceptSetsStore.removeConceptFromSet(concept.conceptId)
}

function ensureConceptSetDraft(): boolean {
  if (conceptSetsStore.currentSet) return false
  conceptSetsStore.openCreateEditor()
  return true
}

function navigateToNewConceptSet() {
  void router.push({ name: 'conceptset-new' })
}

function currentSetName(): string {
  return conceptSetsStore.currentSet?.name || t('components.conceptSetBuilder.newConceptSet').value
}
</script>
