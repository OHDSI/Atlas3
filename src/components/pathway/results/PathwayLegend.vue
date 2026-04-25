<template>
  <div class="pathway-legend">
    <h4>{{ targetCohortName }}</h4>
    <p>{{ totalPathwaysCount.toLocaleString() }} of
      {{ targetCohortCount.toLocaleString() }} persons with pathway
      ({{ pctWithPathway.toFixed(1) }}%)
    </p>
    <table>
      <tbody>
        <tr v-for="(c, i) in design.design.eventCohorts" :key="c.id">
          <td>
            <span class="swatch" :style="{ backgroundColor: colors(String(1 << i)) }" />
          </td>
          <td>{{ c.name }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Pathway } from '@/models/pathway.types'

const props = defineProps<{
  design: Pathway
  colors: (key: string) => string
  targetCohortName: string
  targetCohortCount: number
  totalPathwaysCount: number
}>()

const pctWithPathway = computed(() =>
  props.targetCohortCount === 0
    ? 0
    : (props.totalPathwaysCount / props.targetCohortCount) * 100
)
</script>

<style scoped>
.swatch { display: inline-block; width: 14px; height: 14px; border-radius: 2px; }
.pathway-legend table { width: 100%; }
.pathway-legend td { padding: 2px 8px; }
</style>
