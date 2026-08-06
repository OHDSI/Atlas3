<template>
  <div class="recommend-tab">
    <AtlasAlert
      v-if="store.recommendedError"
      severity="danger"
      :closable="true"
      class="mb-4"
      @close="store.recommendedError = null"
    >
      {{ store.recommendedError }}
    </AtlasAlert>

    <AtlasAlert
      v-else-if="!store.isRecommendedAvailable"
      severity="info"
      class="mb-4"
      data-testid="recommend-not-available"
    >
      {{
        t(
          'cs.conceptSet.recommend.notAvailable',
          'Recommendations are not available. The PHOEBE 2.0 vocabulary tables are required to generate recommendations.'
        )
      }}
    </AtlasAlert>

    <AtlasAlert
      v-else-if="!hasSeed"
      severity="info"
      class="mb-4"
      data-testid="recommend-no-seed"
    >
      {{
        t(
          'cs.conceptSet.recommend.noSeed',
          'Add concepts to the set first — recommendations are based on what is already included.'
        )
      }}
    </AtlasAlert>

    <div
      v-if="hasSeed && store.isRecommendedAvailable"
      class="recommend-tab__bar mb-4"
    >
      <div class="recommend-tab__bar-left">
        <AtlasButton
          variant="ghost"
          size="sm"
          icon="mdi-refresh"
          :disabled="store.loadingRecommended"
          @click="onRefresh"
        >
          {{ t('common.refresh', 'Refresh') }}
        </AtlasButton>

        <span
          v-if="store.recommendedConcepts.length > 0"
          class="text-body-2 text-medium-emphasis"
        >
          {{ store.recommendedConcepts.length }}
          {{ t('cs.conceptSet.recommend.recommendations', 'recommendations') }}
        </span>
      </div>

      <div class="recommend-tab__bar-right">
        <ConceptAddOptions
          v-model="addFlags"
          :selected-count="selected.length"
          :disabled="store.loadingRecommended"
          @add="onAddSelected"
        />
      </div>
    </div>

    <div
      v-if="store.loadingRecommended && store.recommendedConcepts.length === 0"
      class="d-flex align-center justify-center py-12"
      data-testid="recommend-loading"
    >
      <AtlasProgressCircular
        indeterminate
        color="primary"
        size="32"
        class="mr-3"
      />
      <span>{{
        t('cs.conceptSet.loadingRecommendedConcepts', 'Loading Recommended Concepts')
      }}</span>
    </div>

    <ConceptTable
      v-if="
        hasSeed &&
          store.isRecommendedAvailable &&
          !(store.loadingRecommended && store.recommendedConcepts.length === 0)
      "
      v-model:selected="selected"
      :concepts="store.recommendedConcepts"
      :loading="store.loadingRecommended"
      :total-items="store.recommendedConcepts.length"
      :page="page"
      :items-per-page="itemsPerPage"
      :selectable="true"
      @update:page="page = $event"
      @update:items-per-page="
        (n: number) => {
          itemsPerPage = n
          page = 1
        }
      "
    />
  </div>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasProgressCircular } from '@/components/ui'
import { ref, computed, inject, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useWebAPIStore } from '@/stores/webapi'
import ConceptTable from './ConceptTable.vue'
import ConceptAddOptions from './ConceptAddOptions.vue'
import type { Concept, ConceptAddFlags } from '@/models/concept-set.types'

const { t } = useI18n()

interface Props {
  active: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'concepts-added': [count: number]
}>()

const store = useConceptSetsStore()
const webapiStore = useWebAPIStore()

// ConceptsView injects a hardcoded 'SYNPUF1K' that doesn't exist on real
// WebAPI deployments — fall back to the resolved vocabulary source.
const injectedSourceKey = inject<{ value: string }>('sourceKey', { value: '' })
const sourceKey = computed<string>(() => {
  return webapiStore.getValidVocabularySource() || injectedSourceKey.value
})

const selected = ref<number[]>([])
const page = ref(1)
const itemsPerPage = ref(60)

const addFlags = ref<Required<ConceptAddFlags>>({
  isExcluded: false,
  includeDescendants: false,
  includeMapped: false,
})

const hasSeed = computed(() => {
  const items = store.currentSet?.items ?? []
  return items.some(i => !i.isExcluded)
})

const seedSignature = computed(() => {
  return (store.currentSet?.items ?? [])
    .filter(i => !i.isExcluded)
    .map(i => i.conceptId)
    .sort((a, b) => a - b)
    .join(',')
})

watch(
  () => [props.active, seedSignature.value, sourceKey.value] as const,
  ([active, sig, key], prev) => {
    if (!active) return
    if (!hasSeed.value) {
      store.recommendedConcepts = []
      return
    }
    if (!key) return
    const [prevActive, prevSig, prevKey] = prev ?? [false, '', '']
    if (active !== prevActive || sig !== prevSig || key !== prevKey) {
      void store.loadRecommendedConcepts(key)
    }
  },
  { immediate: true }
)

function onRefresh() {
  if (!sourceKey.value) return
  void store.loadRecommendedConcepts(sourceKey.value)
}

function onAddSelected() {
  const ids = new Set(selected.value)
  if (ids.size === 0) return

  const picked: Concept[] = store.recommendedConcepts.filter(c => ids.has(c.conceptId))
  let added = 0
  for (const concept of picked) {
    const beforeCount = store.currentSet?.items.length ?? 0
    store.addConceptToSet(concept, addFlags.value)
    if ((store.currentSet?.items.length ?? 0) === beforeCount) continue
    added += 1
  }

  selected.value = []
  if (added > 0) {
    store.recommendedConcepts = store.recommendedConcepts.filter(c => !ids.has(c.conceptId))
    emit('concepts-added', added)
  }
}
</script>

<style scoped>
.recommend-tab__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.recommend-tab__bar-left,
.recommend-tab__bar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
</style>
