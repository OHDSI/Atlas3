<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import VChart from 'vue-echarts'
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
const activeTab = ref<'age' | 'month'>('age')

const drillable = computed(() => domainPath(props.concept.domainId) !== null)

async function load() {
  if (!drillable.value) return
  await conceptDetail.loadDrilldown(selectedSourceKey.value)
}

onMounted(load)
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

const sourceItems = computed(() =>
  (dataSources.sources ?? []).map((s) => ({ title: s.sourceName, value: s.sourceKey }))
)
</script>

<template>
  <v-card
    v-if="drillable"
    density="compact"
    variant="outlined"
    data-testid="concept-drilldown-chart"
  >
    <v-card-title class="card-title">
      Drilldown Report
      <v-spacer />
      <v-select
        v-model="selectedSourceKey"
        :items="sourceItems"
        density="compact"
        variant="outlined"
        hide-details
        style="max-width: 220px"
      />
    </v-card-title>

    <v-tabs
      v-model="activeTab"
      density="compact"
      bg-color="transparent"
    >
      <v-tab value="age">Age at first occurrence</v-tab>
      <v-tab value="month">Calendar month</v-tab>
    </v-tabs>

    <v-card-text class="card-body">
      <div
        v-if="conceptDetail.isDrilldownLoading"
        class="loading"
      >
        Loading drilldown…
      </div>
      <div
        v-else-if="!report"
        class="empty"
      >
        No drilldown data for this source.
      </div>
      <VChart
        v-else
        :option="currentOption"
        autoresize
        style="height: 280px; width: 100%"
      />
    </v-card-text>
  </v-card>
</template>

<style scoped>
.card-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  gap: 12px;
}
.card-body { padding: 12px; }
.loading, .empty {
  color: rgba(0, 0, 0, 0.6);
  font-size: 12px;
  text-align: center;
  padding: 24px 0;
}
</style>
