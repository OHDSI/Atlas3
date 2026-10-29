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
        <AtlasButton
          toggle
          value="visual"
          size="sm"
        >
          <AtlasIcon start>
            mdi-chart-donut
          </AtlasIcon>
          {{ t('cohortDefinitions.costUtilization.visualization') }}
        </AtlasButton>
        <AtlasButton
          toggle
          value="tabular"
          size="sm"
        >
          <AtlasIcon start>
            mdi-table
          </AtlasIcon>
          {{ t('pathway.results.tabular') }}
        </AtlasButton>
      </v-btn-toggle>
    </template>

    <div
      v-if="loading"
      class="pathway-results__state"
    >
      {{ t('pathway.results.loading').value }}
    </div>
    <template v-else-if="design && results">
      <div
        v-if="mode === 'visual'"
        class="pathway-results__visual"
      >
        <PathwayCohortResults
          v-for="row in resultRows"
          :key="row.targetCohortId"
          :design="design"
          :results="results"
          :target-cohort-id="row.targetCohortId"
          :group="row.group"
          :cohort-name="row.cohortName"
          :colors="colors"
        />
      </div>

      <PathwayTableView
        v-else
        :design="design"
        :results="results"
      />
    </template>
  </AnalysisBuilderShell>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasIcon } from '@/components/ui'
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePathwayResults } from '@/composables/usePathwayResults'
import { useI18n } from '@/composables/useI18n'
import AnalysisBuilderShell from '@/components/analysis/AnalysisBuilderShell.vue'
import PathwayCohortResults from '@/components/pathway/results/PathwayCohortResults.vue'
import { buildCohortResultRows } from '@/components/pathway/pathway-workbench-state'
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
const resultRows = computed(() => buildCohortResultRows(design.value, results.value))

const title = computed(() => {
  const name = design.value?.name?.trim()
  return name || t('pathway.results.title').value
})

const subtitle = computed(() => {
  const exec = execution.value
  if (!exec) return undefined
  return `${t('columns.executionId').value} #${exec.id} · ${exec.sourceKey}`
})

const colorMap = computed(() => {
  const map = new Map<string, string>()
  const singleCodes = (results.value?.eventCodes ?? [])
    .filter(ec => !ec.isCombo)
    .sort((a, b) => a.code - b.code)
  if (singleCodes.length > 0) {
    singleCodes.forEach((ec, i) => {
      map.set(String(ec.code), PALETTE_20[i % PALETTE_20.length] ?? '#cccccc')
    })
  } else if (design.value) {
    design.value.eventCohorts.forEach((cohort, i) => {
      const bit = cohort.code != null ? (1 << cohort.code) : (1 << i)
      map.set(String(bit), PALETTE_20[i % PALETTE_20.length] ?? '#cccccc')
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
  display: flex;
  flex-direction: column;
}
</style>
