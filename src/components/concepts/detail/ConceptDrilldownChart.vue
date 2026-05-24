<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import VChart from 'vue-echarts'
import { AtlasCard, AtlasSelect, AtlasTab, AtlasTabs } from '@/components/ui'
import { useConceptDetailStore } from '@/stores/concept-detail'
import { useDataSourcesStore } from '@/stores/datasources'
import type { Concept } from '@/models/concept-set.types'
import { domainPath } from '@/models/concept-detail.types'

const props = defineProps<{
  concept: Concept
  primarySourceKey: string
}>()

const conceptDetail = useConceptDetailStore()
const dataSources = useDataSourcesStore()

const selectedSourceKey = ref(props.primarySourceKey)
const activeTab = ref<'month' | 'age'>('month')

const drillable = computed(() => domainPath(props.concept.domainId) !== null)

async function load() {
  if (!drillable.value) return
  await conceptDetail.loadDrilldown(selectedSourceKey.value)
}

async function ensureSources() {
  // Drilldown lives in the side panel which can mount before the data
  // sources store has loaded. Without this, the select shows an empty
  // "(no value)" placeholder. Calling fetchDataSources is idempotent and
  // safe — the store guards against re-loading.
  if ((dataSources.sources ?? []).length === 0) {
    try {
      await dataSources.fetchDataSources()
    } catch {
      // Non-fatal: the chart still renders with the primary source as
      // the lone fallback in `sourceItems`.
    }
  }
}

onMounted(() => {
  void ensureSources()
  void load()
})
watch(selectedSourceKey, load)
watch(() => props.concept.conceptId, load)

const report = computed(() =>
  conceptDetail.drilldownBySource?.get?.(selectedSourceKey.value) ?? null
)

const ageOption = computed(() => {
  const series = report.value?.ageAtFirstOccurrence ?? []
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: series.map((r) => r.category) },
    yAxis: { type: 'value', name: 'Age' },
    series: [
      {
        name: 'Age at first occurrence',
        type: 'boxplot',
        data: series.map((r) => [
          r.minValue,
          r.p25Value,
          r.medianValue,
          r.p75Value,
          r.maxValue,
        ]),
        itemStyle: { color: '#1976d2' },
      },
    ],
  }
})

const monthOption = computed(() => {
  const series = report.value?.prevalenceByMonth ?? []
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: series.map((r) => String(r.calendarMonth)),
    },
    yAxis: { type: 'value', name: 'per 1000' },
    series: [
      {
        name: 'Prevalence',
        type: 'line',
        smooth: true,
        data: series.map((r) => r.prevalence1000pp),
        itemStyle: { color: '#1976d2' },
      },
    ],
  }
})

const currentOption = computed(() =>
  activeTab.value === 'age' ? ageOption.value : monthOption.value
)

const activeSeriesEmpty = computed(() => {
  if (activeTab.value === 'age') {
    return (report.value?.ageAtFirstOccurrence ?? []).length === 0
  }
  return (report.value?.prevalenceByMonth ?? []).length === 0
})

const sourceItems = computed(() => {
  const list = (dataSources.sources ?? []).map((s) => ({
    title: s.sourceName,
    value: s.sourceKey,
  }))
  // Guarantee the dropdown always has at least the primary source so the
  // user never sees an empty "(no value)" select while sources are still
  // loading or unavailable.
  if (selectedSourceKey.value && !list.some((i) => i.value === selectedSourceKey.value)) {
    list.unshift({ title: selectedSourceKey.value, value: selectedSourceKey.value })
  }
  return list
})
</script>

<template>
  <AtlasCard
    v-if="drillable"
    padding="none"
    data-testid="concept-drilldown-chart"
  >
    <header class="card-title">
      <span>Drilldown Report</span>
      <AtlasSelect
        v-model="selectedSourceKey"
        :items="sourceItems"
        hide-details
        style="max-width: 220px"
      />
    </header>

    <AtlasTabs
      v-model="activeTab"
      bg-color="transparent"
    >
      <AtlasTab value="month">
        Calendar month
      </AtlasTab>
      <AtlasTab value="age">
        Age at first occurrence
      </AtlasTab>
    </AtlasTabs>

    <div class="card-body">
      <div
        v-if="conceptDetail.isDrilldownLoading"
        class="loading"
      >
        Loading drilldown…
      </div>
      <div
        v-else-if="!report || activeSeriesEmpty"
        class="empty"
      >
        No drilldown data for this concept in {{ selectedSourceKey }}.
      </div>
      <VChart
        v-else
        :option="currentOption"
        autoresize
        style="height: 320px; width: 100%"
      />
    </div>
  </AtlasCard>
</template>

<style scoped>
.card-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.card-body { padding: 16px; }
.loading, .empty {
  color: rgba(0, 0, 0, 0.6);
  font-size: 12px;
  text-align: center;
  padding: 24px 0;
}
</style>
