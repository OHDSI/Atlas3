<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useConceptDetailStore } from '@/stores/concept-detail'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useI18n } from '@/composables/useI18n'
import { AtlasAlert, AtlasProgressLinear, AtlasSnackbar } from '@/components/ui'
import type { Concept } from '@/models/concept-set.types'
import ConceptDetailHeader from '@/components/concepts/detail/ConceptDetailHeader.vue'
import ConceptStatCards from '@/components/concepts/detail/ConceptStatCards.vue'
import ConceptAttributesCard from '@/components/concepts/detail/ConceptAttributesCard.vue'
import ConceptHierarchyMiniMap from '@/components/concepts/detail/ConceptHierarchyMiniMap.vue'
import ConceptRelatedTable from '@/components/concepts/detail/ConceptRelatedTable.vue'
import DrilldownDetails from '@/components/reports/DrilldownDetails.vue'
import { domainPath } from '@/models/concept-detail.types'
import type { Domain } from '@/config/drilldown-config'

const props = defineProps<{
  sourceKey: string
  conceptId: number
}>()

const store = useConceptDetailStore()
const { concept, isLoading, error, related, parents, children, recordCountsBySource, hierarchyError } =
  storeToRefs(store)

const conceptSetsStore = useConceptSetsStore()
const { t } = useI18n()
const feedback = ref<{ open: boolean; text: string }>({ open: false, text: '' })

// Add the viewed concept to the open set, or start a new untitled set.
function onAddToConceptSet(c: Concept) {
  if (!conceptSetsStore.currentSet) {
    conceptSetsStore.openCreateEditor()
  }
  conceptSetsStore.addConceptToSet(c)
  const setName =
    conceptSetsStore.currentSet?.name ||
    t('components.conceptSetBuilder.newConceptSet', 'New concept set').value
  feedback.value = {
    open: true,
    text: t('search.addedToSet', 'Added "{concept}" → {set}', {
      concept: c.conceptName,
      set: setName,
    }).value,
  }
}

// Grey out the previously-shown concept while a different one loads.
const isStale = computed(
  () => isLoading.value && !!concept.value && concept.value.conceptId !== props.conceptId,
)

async function load() {
  await store.loadConcept(props.sourceKey, props.conceptId)
  await store.loadDrilldown(props.sourceKey)
}

onMounted(load)
watch(() => [props.sourceKey, props.conceptId], load)
</script>

<template>
  <div
    class="concept-detail-view"
    data-testid="concept-detail-view"
  >
    <AtlasProgressLinear
      v-if="isLoading"
      indeterminate
      color="primary"
    />

    <AtlasAlert
      v-if="error"
      severity="danger"
      class="ma-4"
    >
      {{ error }}
    </AtlasAlert>

    <template v-if="concept && !error">
      <ConceptDetailHeader
        :class="{ 'is-stale': isStale }"
        :concept="concept"
        @add-to-concept-set="onAddToConceptSet"
      />

      <div
        class="concept-detail-body"
        :class="{ 'is-stale': isStale }"
      >
        <ConceptStatCards
          :concept-id="concept.conceptId"
          :primary-source-key="props.sourceKey"
          :counts-by-source="recordCountsBySource"
        />

        <div class="concept-detail-row">
          <ConceptAttributesCard :concept="concept" />
          <ConceptHierarchyMiniMap
            :concept="concept"
            :parents="parents"
            :children="children"
            :load-failed="!!hierarchyError"
          />
        </div>

        <ConceptRelatedTable
          :related="related"
          :source-key="props.sourceKey"
        />

        <DrilldownDetails
          v-if="domainPath(concept.domainId)"
          :data="store.getDrilldown(props.sourceKey, concept.conceptId)"
          :loading="store.isDrilldownLoading"
          :concept-name="concept.conceptName"
          :domain="(domainPath(concept.domainId) as Domain) ?? 'condition'"
          :show-header="false"
          :compact="true"
        />
      </div>
    </template>

    <AtlasSnackbar
      v-model="feedback.open"
      severity="success"
      :text="feedback.text"
    />
  </div>
</template>

<style scoped>
.concept-detail-view {
  background: rgb(var(--v-theme-background));
  min-height: 100vh;
}
/* Stale content while a different concept loads: dim and freeze interaction. */
.is-stale {
  opacity: 0.45;
  pointer-events: none;
  transition: opacity 120ms ease;
}
.concept-detail-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 1440px;
  margin: 0 auto;
}
.concept-detail-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 12px;
}
@media (max-width: 1024px) {
  .concept-detail-row {
    grid-template-columns: 1fr;
  }
}
</style>
