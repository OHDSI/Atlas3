<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useConceptDetailDrawerStore } from '@/stores/concept-detail-drawer'
import { useConceptDetailStore } from '@/stores/concept-detail'
import { AtlasAlert, AtlasIconButton, AtlasProgressLinear } from '@/components/ui'
import ConceptDetailHeader from '@/components/concepts/detail/ConceptDetailHeader.vue'
import ConceptStatCards from '@/components/concepts/detail/ConceptStatCards.vue'
import ConceptAttributesCard from '@/components/concepts/detail/ConceptAttributesCard.vue'
import ConceptHierarchyMiniMap from '@/components/concepts/detail/ConceptHierarchyMiniMap.vue'
import ConceptRelatedTable from '@/components/concepts/detail/ConceptRelatedTable.vue'
import ConceptDrilldownChart from '@/components/concepts/detail/ConceptDrilldownChart.vue'

const drawer = useConceptDetailDrawerStore()
const { isOpen, sourceKey, conceptId } = storeToRefs(drawer)

const detail = useConceptDetailStore()
const { concept, isLoading, error, related, parents, children, recordCountsBySource } =
  storeToRefs(detail)

const drawerOpen = computed({
  get: () => isOpen.value,
  set: (v: boolean) => {
    if (!v) drawer.close()
  },
})

watch(
  [isOpen, sourceKey, conceptId],
  async ([open, sk, cid]) => {
    if (open && sk && cid != null) {
      await detail.loadConcept(sk, cid)
    }
  },
  { immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <v-navigation-drawer
      v-model="drawerOpen"
      location="right"
      temporary
      :width="900"
      class="concept-detail-drawer"
    >
      <div class="drawer-shell">
        <div class="drawer-toolbar">
          <AtlasIconButton
            icon="mdi-close"
            variant="text"
            size="sm"
            :aria-label="'Close concept details'"
            v-bind="{ ariaLabel: 'Close concept details' }"
            data-testid="concept-drawer-close"
            @click="drawer.close()"
          />
        </div>

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
          <ConceptDetailHeader :concept="concept" />

          <div class="drawer-body">
            <ConceptStatCards
              :concept-id="concept.conceptId"
              :primary-source-key="sourceKey"
              :counts-by-source="recordCountsBySource"
            />

            <div class="drawer-row">
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
              :primary-source-key="sourceKey"
            />
          </div>
        </template>
      </div>
    </v-navigation-drawer>
  </Teleport>
</template>

<style scoped>
.concept-detail-drawer {
  background: rgb(var(--v-theme-background));
}
.drawer-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}
.drawer-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px 0;
}
.drawer-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.drawer-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 12px;
}
@media (max-width: 1280px) {
  .drawer-row {
    grid-template-columns: 1fr;
  }
}
</style>
