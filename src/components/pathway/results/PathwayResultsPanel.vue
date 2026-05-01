<template>
  <div class="pathway-results-panel">
    <div class="pathway-results-panel__header">
      <div class="pathway-results-panel__title-block">
        <span class="text-eyebrow">{{ t('pathway.results.title', 'Results').value }}</span>
        <span class="pathway-results-panel__rule" />
        <span class="text-body-2 text-medium-emphasis">
          {{ t('columns.executionId', 'Execution').value }} #{{ executionId }}
        </span>
      </div>
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
    </div>

    <div
      v-if="loading"
      class="pathway-results-panel__state"
    >
      {{ t('common.loading', 'Loading results…').value }}
    </div>

    <v-alert
      v-else-if="error"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-3"
    >
      {{ error }}
    </v-alert>

    <template v-else-if="design && results && targetGroup">
      <div
        v-if="mode === 'visual'"
        class="pathway-results-panel__visual"
      >
        <div class="pathway-results-panel__legend-col">
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
        <div class="pathway-results-panel__chart-col">
          <PathwaySunburst
            :design="design"
            :results="results"
            :target-cohort-id="targetGroup.targetCohortId"
            @pathway:select="(info) => (selectedPath = info)"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { usePathwayResults } from '@/composables/usePathwayResults'
import { useI18n } from '@/composables/useI18n'
import PathwaySunburst from './PathwaySunburst.vue'
import PathwayLegend from './PathwayLegend.vue'
import PathwayPathDetails from './PathwayPathDetails.vue'
import PathwayTableView from './PathwayTableView.vue'

const PALETTE_20 = [
  '#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f',
  '#bcbd22','#17becf','#aec7e8','#ffbb78','#98df8a','#ff9896','#c5b0d5','#c49c94',
  '#f7b6d2','#c7c7c7','#dbdb8d','#9edae5',
]

const props = defineProps<{ executionId: number }>()

const { design, results, loading, error, load } = usePathwayResults()
const { t } = useI18n()

const mode = ref<'visual' | 'tabular'>('visual')
const selectedPath = ref<{ code: number; nodeName: string; value: number } | null>(null)

const targetGroup = computed(() =>
  results.value ? (results.value.pathwayGroups[0] ?? null) : null,
)

const targetCohortName = computed(() => {
  if (!design.value || !targetGroup.value) return ''
  return design.value.targetCohorts.find(
    (c) => c.id === targetGroup.value!.targetCohortId,
  )?.name ?? ''
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

watch(
  () => props.executionId,
  (id) => {
    if (Number.isFinite(id) && id > 0) load(id)
  },
)

onMounted(() => {
  if (Number.isFinite(props.executionId) && props.executionId > 0) {
    load(props.executionId)
  }
})
</script>

<style scoped>
.pathway-results-panel {
  margin-top: 16px;
}

.pathway-results-panel__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.pathway-results-panel__title-block {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.pathway-results-panel__rule {
  display: inline-block;
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}

.pathway-results-panel__state {
  padding: 32px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.pathway-results-panel__visual {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
}

@media (max-width: 1100px) {
  .pathway-results-panel__visual {
    grid-template-columns: 1fr;
  }
}
</style>
