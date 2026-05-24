<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useConceptDetailStore } from '@/stores/concept-detail'
import { AtlasAlert, AtlasProgressLinear } from '@/components/ui'
import ConceptDetailHeader from '@/components/concepts/detail/ConceptDetailHeader.vue'
import ConceptStatCards from '@/components/concepts/detail/ConceptStatCards.vue'
import ConceptAttributesCard from '@/components/concepts/detail/ConceptAttributesCard.vue'
import ConceptHierarchyMiniMap from '@/components/concepts/detail/ConceptHierarchyMiniMap.vue'
import ConceptRelatedTable from '@/components/concepts/detail/ConceptRelatedTable.vue'
import ConceptDrilldownChart from '@/components/concepts/detail/ConceptDrilldownChart.vue'

const props = defineProps<{
  sourceKey: string
  conceptId: number
  /**
   * Optional back handler — forwarded to ConceptDetailHeader. When supplied
   * (e.g., from the concept set editor inline view), the header's back
   * button calls this instead of using its default routing/drawer logic.
   */
  onBack?: () => void
}>()

const store = useConceptDetailStore()
const { concept, isLoading, error, related, parents, children, recordCountsBySource } =
  storeToRefs(store)

async function load() {
  if (props.sourceKey && props.conceptId) {
    await store.loadConcept(props.sourceKey, props.conceptId)
  }
}

onMounted(load)
watch(() => [props.sourceKey, props.conceptId], load)
</script>

<template>
  <div
    class="concept-detail-content"
    data-testid="concept-detail-content"
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
        :concept="concept"
        :on-back="onBack"
      />

      <div class="content-body">
        <ConceptStatCards
          :concept-id="concept.conceptId"
          :primary-source-key="props.sourceKey"
          :counts-by-source="recordCountsBySource"
        />

        <div class="content-row">
          <ConceptAttributesCard :concept="concept" />
          <ConceptHierarchyMiniMap
            :concept="concept"
            :parents="parents"
            :children="children"
            :source-key="props.sourceKey"
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
.concept-detail-content {
  display: flex;
  flex-direction: column;
}
.content-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.content-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 12px;
}
@media (max-width: 1280px) {
  .content-row {
    grid-template-columns: 1fr;
  }
}
</style>
