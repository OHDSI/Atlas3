<template>
  <table class="pathway-legend">
    <tbody>
      <tr
        v-for="(c, i) in design.eventCohorts"
        :key="c.id"
      >
        <td>
          <span
            class="swatch"
            :style="{ backgroundColor: colors(String(1 << i)) }"
          />
        </td>
        <td>{{ c.name }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import type { Pathway } from '@/models/pathway.types'

defineProps<{
  design: Pathway
  colors: (key: string) => string
  targetCohortName?: string
  targetCohortCount?: number
  totalPathwaysCount?: number
}>()
</script>

<style scoped>
.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 2px;
}
.pathway-legend table {
  width: 100%;
}
.pathway-legend td {
  padding: 2px 8px;
}
</style>
