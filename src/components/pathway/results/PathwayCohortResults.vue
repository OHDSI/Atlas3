<template>
  <PathwayCohortSection
    :cohort-name="cohortName"
    :testid="`pathway-cohort-results-${targetCohortId}`"
  >
    <div class="cohort-results">
      <div class="cohort-results__chart">
        <PathwaySunburst
          v-if="group"
          :design="design"
          :results="results"
          :target-cohort-id="targetCohortId"
          :colors="colors"
          @pathway:select="onSelect"
        />
        <div
          v-else
          class="cohort-results__no-data"
          data-testid="pathway-cohort-no-data"
        >
          {{ t('common.noData').value }}
        </div>
      </div>
      <div class="cohort-results__legend">
        <div class="cohort-results__label">
          {{ t('pathway.workbench.legend').value }}
        </div>
        <PathwayLegend
          :design="design"
          :colors="colors"
          :event-codes="results.eventCodes"
          :target-cohort-name="cohortName"
          :target-cohort-count="group?.targetCohortCount"
          :total-pathways-count="group?.totalPathwaysCount"
        />
      </div>
      <div class="cohort-results__insights">
        <PathwayCoverageStat
          v-if="group"
          :total-pathways-count="group.totalPathwaysCount"
          :target-cohort-count="group.targetCohortCount"
        />
        <div
          v-if="group"
          class="cohort-results__label"
        >
          {{ t('pathway.workbench.selectedPath').value }}
        </div>
        <PathwayPathStats
          v-if="group && pathStats"
          :stats="pathStats"
          :colors="colors"
        />
        <div
          v-else-if="group"
          class="cohort-results__hint"
          data-testid="insights-empty-hint"
        >
          {{ t('pathway.workbench.selectPathHint').value }}
        </div>
      </div>
    </div>
  </PathwayCohortSection>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { computePathStats } from '@/utils/pathway-path-stats'
import type { Pathway, PathwayGroup, PathwayResults } from '@/models/pathway.types'
import PathwayCohortSection from './PathwayCohortSection.vue'
import PathwaySunburst from './PathwaySunburst.vue'
import PathwayLegend from './PathwayLegend.vue'
import PathwayCoverageStat from './PathwayCoverageStat.vue'
import PathwayPathStats from './PathwayPathStats.vue'

const props = defineProps<{
  design: Pathway
  results: PathwayResults
  targetCohortId: number
  group?: PathwayGroup
  cohortName: string
  colors: (key: string) => string
}>()

const { t } = useI18n()
const selectedPath = ref<{ path: string } | null>(null)

const pathStats = computed(() => {
  if (!props.group) return null
  return computePathStats({
    design: props.design,
    results: props.results,
    targetCohortId: props.targetCohortId,
    selectedPath: selectedPath.value,
  })
})

function onSelect(info: { code: number; nodeName: string; value: number }) {
  selectedPath.value = { path: info.nodeName }
}
</script>

<style scoped>
.cohort-results {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px 300px;
  gap: 24px;
  align-items: start;
}
.cohort-results__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface));
  margin: 0 0 6px;
}
.cohort-results__insights .cohort-results__label {
  margin-top: 14px;
}
.cohort-results__hint {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.62);
}
.cohort-results__no-data {
  display: grid;
  min-height: 500px;
  place-items: center;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 8px;
  color: rgba(var(--v-theme-on-surface), 0.62);
}
</style>
