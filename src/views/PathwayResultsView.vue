<template>
  <v-container>
    <div v-if="loading">Loading results…</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <template v-else-if="design && results && targetGroup">
      <h2>Execution {{ execution?.id }} — {{ execution?.sourceKey }}</h2>

      <v-btn-toggle
        :model-value="mode"
        @update:model-value="(v: 'visual' | 'tabular' | null) => v && (mode = v)"
      >
        <v-btn value="visual">Visualization</v-btn>
        <v-btn value="tabular">Tabular</v-btn>
      </v-btn-toggle>

      <div v-if="mode === 'visual'" class="visual">
        <div class="legend-col">
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
        <div class="chart-col">
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
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePathwayResults } from '@/composables/usePathwayResults'
import PathwaySunburst from '@/components/pathway/results/PathwaySunburst.vue'
import PathwayLegend from '@/components/pathway/results/PathwayLegend.vue'
import PathwayPathDetails from '@/components/pathway/results/PathwayPathDetails.vue'
import PathwayTableView from '@/components/pathway/results/PathwayTableView.vue'

const PALETTE_20 = [
  '#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f',
  '#bcbd22','#17becf','#aec7e8','#ffbb78','#98df8a','#ff9896','#c5b0d5','#c49c94',
  '#f7b6d2','#c7c7c7','#dbdb8d','#9edae5',
]

const route = useRoute()
const { execution, design, results, loading, error, load } = usePathwayResults()
const mode = ref<'visual' | 'tabular'>('visual')
const selectedPath = ref<{ code: number; nodeName: string; value: number } | null>(null)

const targetGroup = computed(() => {
  if (!results.value) return null
  return results.value.pathwayGroups[0] ?? null
})

const targetCohortName = computed(() => {
  if (!design.value || !targetGroup.value) return ''
  return design.value.design.targetCohorts.find(
    c => c.id === targetGroup.value!.targetCohortId
  )?.name ?? ''
})

const colorMap = computed(() => {
  const map = new Map<string, string>()
  if (design.value) {
    design.value.design.eventCohorts.forEach((_, i) => {
      map.set(String(1 << i), PALETTE_20[i % PALETTE_20.length] ?? '#cccccc')
    })
  }
  return map
})
const colors = (key: string): string => colorMap.value.get(key) ?? '#ccc'

onMounted(() => {
  const gid = Number(route.params.executionId)
  if (Number.isFinite(gid)) load(gid)
})
</script>

<style scoped>
.error { color: #c00; padding: 16px; }
.visual { display: grid; grid-template-columns: 280px 1fr; gap: 16px; margin-top: 16px; }
@media (max-width: 1100px) { .visual { grid-template-columns: 1fr; } }
</style>
