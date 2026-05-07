<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useConceptDetailStore } from '@/stores/concept-detail'
import ConceptDetailHeader from '@/components/concepts/detail/ConceptDetailHeader.vue'
import ConceptStatCards from '@/components/concepts/detail/ConceptStatCards.vue'
import ConceptAttributesCard from '@/components/concepts/detail/ConceptAttributesCard.vue'
import ConceptHierarchyMiniMap from '@/components/concepts/detail/ConceptHierarchyMiniMap.vue'
import ConceptRelatedTable from '@/components/concepts/detail/ConceptRelatedTable.vue'
import ConceptDrilldownChart from '@/components/concepts/detail/ConceptDrilldownChart.vue'

const props = defineProps<{
  sourceKey: string
  conceptId: number
}>()

const store = useConceptDetailStore()
const { concept, isLoading, error, related, parents, children, recordCountsBySource } =
  storeToRefs(store)

async function load() {
  await store.loadConcept(props.sourceKey, props.conceptId)
}

onMounted(load)
watch(() => [props.sourceKey, props.conceptId], load)
</script>

<template>
  <div
    class="concept-detail-view"
    data-testid="concept-detail-view"
  >
    <v-progress-linear
      v-if="isLoading"
      indeterminate
      color="primary"
    />

    <v-alert
      v-if="error"
      type="error"
      density="compact"
      class="ma-4"
    >
      {{ error }}
    </v-alert>

    <template v-if="concept && !error">
      <ConceptDetailHeader :concept="concept" />

      <div class="concept-detail-body">
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
          />
        </div>

        <ConceptRelatedTable :related="related" />

        <ConceptDrilldownChart
          :concept="concept"
          :primary-source-key="props.sourceKey"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.concept-detail-view {
  background: rgb(var(--v-theme-background));
  min-height: 100vh;
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
