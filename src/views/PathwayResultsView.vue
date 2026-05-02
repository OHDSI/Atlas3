<template>
  <AnalysisBuilderShell
    :title="title"
    :subtitle="subtitle"
    :error="error"
    :show-back="true"
    testid="pathway-results"
    @back="handleBack"
  >
    <template #actions>
      <v-btn-toggle
        :model-value="mode"
        density="compact"
        variant="outlined"
        divided
        mandatory
        @update:model-value="(v: 'visual' | 'tabular' | null) => v && (mode = v)"
      >
        <v-btn
          value="visual"
          size="small"
        >
          <v-icon start>
            mdi-chart-donut
          </v-icon>
          {{ t('cohortDefinitions.costUtilization.visualization', 'Visualization') }}
        </v-btn>
        <v-btn
          value="tabular"
          size="small"
        >
          <v-icon start>
            mdi-table
          </v-icon>
          {{ t('pathway.results.tabular', 'Tabular') }}
        </v-btn>
      </v-btn-toggle>
    </template>

    <div
      v-if="loading"
      class="pathway-results__state"
    >
      {{ t('common.loading', 'Loading results…').value }}
    </div>
    <template v-else-if="design && results && targetGroup">
      <div
        v-if="mode === 'visual'"
        class="pathway-results__visual"
      >
        <div class="pathway-results__legend-col">
          <PathwayLegend
            :design="design"
            :colors="colors"
            :target-cohort-name="targetCohortName"
            :target-cohort-count="targetGroup.targetCohortCount"
            :total-pathways-count="targetGroup.totalPathwaysCount"
          />
          <PathwayPathDetails
            v-if="selectedPath"
            :steps="[]"
            :event-codes="results.eventCodes"
            :colors="colors"
          />
        </div>
        <div class="pathway-results__chart-col">
          <PathwaySunburst
            :design="design"
            :results="results"
            :target-cohort-id="targetGroup.targetCohortId"
            @pathway:select="info => (selectedPath = info)"
          />
        </div>
      </div>

      <PathwayTableView
        v-else
        :design="design"
        :results="results"
        :target-cohort-id="targetGroup.targetCohortId"
      />
    </template>
  </AnalysisBuilderShell>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePathwayResults } from '@/composables/usePathwayResults'
import { useI18n } from '@/composables/useI18n'
import AnalysisBuilderShell from '@/components/analysis/AnalysisBuilderShell.vue'
import PathwaySunburst from '@/components/pathway/results/PathwaySunburst.vue'
import PathwayLegend from '@/components/pathway/results/PathwayLegend.vue'
import PathwayPathDetails from '@/components/pathway/results/PathwayPathDetails.vue'
import PathwayTableView from '@/components/pathway/results/PathwayTableView.vue'

const PALETTE_20 = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
  '#aec7e8',
  '#ffbb78',
  '#98df8a',
  '#ff9896',
  '#c5b0d5',
  '#c49c94',
  '#f7b6d2',
  '#c7c7c7',
  '#dbdb8d',
  '#9edae5',
]

const route = useRoute()
const router = useRouter()
const { execution, design, results, loading, error, load } = usePathwayResults()
const { t } = useI18n()
const mode = ref<'visual' | 'tabular'>('visual')
const selectedPath = ref<{ code: number; nodeName: string; value: number } | null>(null)

const targetGroup = computed(() => {
  if (!results.value) return null
  return results.value.pathwayGroups[0] ?? null
})

const title = computed(() => {
  const name = design.value?.name?.trim()
  return name || t('pathway.results.title', 'Pathway results').value
})

const subtitle = computed(() => {
  const exec = execution.value
  if (!exec) return undefined
  return `${t('columns.executionId', 'Execution').value} #${exec.id} · ${exec.sourceKey}`
})

const targetCohortName = computed(() => {
  if (!design.value || !targetGroup.value) return ''
  return (
    design.value.targetCohorts.find(c => c.id === targetGroup.value!.targetCohortId)?.name ?? ''
  )
})

const colorMap = computed(() => {
  const map = new Map<string, string>()
  if (design.value) {
    design.value.eventCohorts.forEach((_, i) => {
      map.set(String(1 << i), PALETTE_20[i % PALETTE_20.length] ?? '#cccccc')
    })
  }
  return map
})
const colors = (key: string): string => colorMap.value.get(key) ?? '#ccc'

function handleBack() {
  if (design.value?.id) {
    router.push(`/pathways/${design.value.id}`)
  } else {
    router.push('/analysis/pathways')
  }
}

onMounted(() => {
  const gid = Number(route.params.executionId)
  if (Number.isFinite(gid)) load(gid)
})
</script>

<style scoped>
.pathway-results__state {
  padding: 32px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.pathway-results__visual {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
}

@media (max-width: 1100px) {
  .pathway-results__visual {
    grid-template-columns: 1fr;
  }
}
</style>
