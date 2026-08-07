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
  /**
   * Optional back handler — forwarded to ConceptDetailHeader. When supplied
   * (e.g., from the concept set editor inline view), the header's back
   * button calls this instead of using its default routing/drawer logic.
   */
  onBack?: () => void
}>()

const store = useConceptDetailStore()
const { concept, isLoading, error, related, parents, children, recordCountsBySource, hierarchyError } =
  storeToRefs(store)

const conceptSetsStore = useConceptSetsStore()
const { t } = useI18n()
const feedback = ref<{ open: boolean; text: string }>({ open: false, text: '' })

// The header's "Add to Concept Set" button was previously unhandled here, so it
// silently did nothing. Mirror the standalone search: add to the set being
// edited, or create a new untitled set when none is open.
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

// While a different concept loads (e.g. after jumping to a related concept),
// the store still holds the previously-shown concept. Grey it out so the
// stale content reads as "loading", not current.
const isStale = computed(
  () => isLoading.value && !!concept.value && concept.value.conceptId !== props.conceptId,
)

async function load() {
  if (props.sourceKey && props.conceptId) {
    await store.loadConcept(props.sourceKey, props.conceptId)
    await store.loadDrilldown(props.sourceKey)
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
        :class="{ 'is-stale': isStale }"
        :concept="concept"
        :on-back="onBack"
        @add-to-concept-set="onAddToConceptSet"
      />

      <div
        class="content-body"
        :class="{ 'is-stale': isStale }"
      >
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
            :load-failed="!!hierarchyError"
          />
        </div>

        <ConceptRelatedTable
          :related="related"
          :source-key="props.sourceKey"
        />

        <DrilldownDetails
          v-if="domainPath(concept.domainId)"
          :data="store.drilldownBySource.get(props.sourceKey) ?? null"
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
.concept-detail-content {
  display: flex;
  flex-direction: column;
}
/* Stale content while a different concept loads: dim and freeze interaction. */
.is-stale {
  opacity: 0.45;
  pointer-events: none;
  transition: opacity 120ms ease;
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
