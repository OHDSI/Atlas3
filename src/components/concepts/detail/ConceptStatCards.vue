<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { AtlasAlert, AtlasButton, AtlasCard, AtlasProgressLinear } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useDataSourcesStore } from '@/stores/datasources'
import { useConceptDetailStore } from '@/stores/concept-detail'
import type { ConceptRecordCount } from '@/models/concept-detail.types'

const { t } = useI18n()

const props = defineProps<{
  conceptId: number
  primarySourceKey: string
  countsBySource: Map<string, ConceptRecordCount>
}>()

const dataSources = useDataSourcesStore()
const conceptDetail = useConceptDetailStore()
const isExpanded = ref(false)
const isLoadingCounts = ref(false)
const initialVisibleCount = 6

const eligibleSources = computed(() =>
  dataSources.sources.filter((source) =>
    source.daimons.some((daimon) => daimon.daimonType === 'Results')
  )
)

const rankedSources = computed(() =>
  [...eligibleSources.value].sort((left, right) => {
    const leftCount = props.countsBySource.get(left.sourceKey)?.recordCount
    const rightCount = props.countsBySource.get(right.sourceKey)?.recordCount

    if (leftCount == null && rightCount != null) return 1
    if (leftCount != null && rightCount == null) return -1
    if (leftCount != null && rightCount != null && leftCount !== rightCount) {
      return rightCount - leftCount
    }

    return left.sourceName.localeCompare(right.sourceName) || left.sourceKey.localeCompare(right.sourceKey)
  })
)

const visibleSources = computed(() =>
  isExpanded.value ? rankedSources.value : rankedSources.value.slice(0, initialVisibleCount)
)

const hasMoreSources = computed(() => rankedSources.value.length > initialVisibleCount)

function formatCount(n: number | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return n.toLocaleString('en-US')
  return String(n)
}

function formatPercent(persons: number | undefined): string {
  if (persons == null || persons === 0) return '—'
  return persons.toLocaleString('en-US')
}

async function ensureCounts() {
  const others = eligibleSources.value
    .map((s) => s.sourceKey)
    .filter((k) => k !== props.primarySourceKey)
  if (others.length > 0) {
    await conceptDetail.loadRecordCountsForSources(others, props.conceptId)
  }
}

async function loadSourcesAndCounts() {
  await dataSources.ensureDataSources()
  if (dataSources.error.sources) return

  isLoadingCounts.value = true
  try {
    await ensureCounts()
  } finally {
    isLoadingCounts.value = false
  }
}

onMounted(loadSourcesAndCounts)
watch(
  () => [props.conceptId, props.primarySourceKey],
  () => {
    isExpanded.value = false
    void loadSourcesAndCounts()
  }
)
</script>

<template>
  <section
    class="stat-cards"
    data-testid="concept-stat-cards"
  >
    <AtlasProgressLinear
      v-if="dataSources.loading.sources || isLoadingCounts"
      data-testid="concept-stat-cards-loading"
      indeterminate
      color="primary"
    />

    <AtlasAlert
      v-else-if="dataSources.error.sources"
      data-testid="concept-stat-cards-source-error"
      severity="warning"
    >
      {{ t('components.conceptDetail.sourcesLoadFailed').value }}
      <AtlasButton
        variant="link"
        size="sm"
        @click="loadSourcesAndCounts"
      >
        {{ t('common.retry').value }}
      </AtlasButton>
    </AtlasAlert>

    <AtlasAlert
      v-else-if="dataSources.sourcesLoaded && eligibleSources.length === 0"
      data-testid="concept-stat-cards-empty"
      severity="info"
    >
      {{ t('components.conceptDetail.noResultsSources').value }}
    </AtlasAlert>

    <template v-else-if="dataSources.sourcesLoaded">
      <div class="stat-grid">
        <AtlasCard
          v-for="source in visibleSources"
          :key="source.sourceKey"
          :data-testid="`stat-card-${source.sourceKey}`"
          padding="md"
          class="stat-card"
        >
          <div class="stat-source">
            {{ source.sourceName }}
          </div>
          <div class="stat-big">
            {{ formatCount(countsBySource.get(source.sourceKey)?.recordCount) }}
          </div>
          <div class="stat-sub">
            {{ formatPercent(countsBySource.get(source.sourceKey)?.personCount) }} {{ t('components.conceptDetail.persons').value }} ·
            {{ formatCount(countsBySource.get(source.sourceKey)?.descendantRecordCount) }} {{ t('components.conceptDetail.descAbbr').value }}
          </div>
        </AtlasCard>
      </div>

      <AtlasButton
        v-if="hasMoreSources"
        variant="secondary"
        size="sm"
        :aria-expanded="isExpanded"
        data-testid="concept-stat-cards-toggle"
        @click="isExpanded = !isExpanded"
      >
        {{ isExpanded
          ? t('components.conceptDetail.showFewerSources').value
          : t('components.conceptDetail.showAllSources', { count: rankedSources.length }).value }}
      </AtlasButton>
    </template>
  </section>
</template>

<style scoped>
.stat-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.stat-card { /* AtlasCard handles padding */ }
.stat-source {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--atlas-color-on-surface-variant);
  margin-bottom: 6px;
}
.stat-big {
  font-size: 24px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.stat-sub {
  font-size: 12px;
  color: var(--atlas-color-on-surface-variant);
  font-variant-numeric: tabular-nums;
  margin-top: 4px;
}
</style>
