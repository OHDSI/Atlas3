<template>
  <table class="pathway-legend">
    <tbody>
      <tr
        v-for="item in items"
        :key="item.code"
      >
        <td>
          <span
            class="swatch"
            :style="{ backgroundColor: colors(String(item.code)) }"
          />
        </td>
        <td>{{ item.name }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Pathway, PathwayEventCode } from '@/models/pathway.types'

const props = defineProps<{
  design: Pathway
  colors: (key: string) => string
  eventCodes?: PathwayEventCode[]
  targetCohortName?: string
  targetCohortCount?: number
  totalPathwaysCount?: number
}>()

const items = computed(() => {
  if (props.eventCodes) {
    return props.eventCodes
      .filter(ec => !ec.isCombo)
      .sort((a, b) => a.code - b.code)
  }
  return props.design.eventCohorts.map((c, i) => ({
    code: c.code != null ? (1 << c.code) : (1 << i),
    name: c.name,
    isCombo: false,
  }))
})
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
