<template>
  <table class="path-details">
    <thead>
      <tr>
        <th />
        <th>Event</th>
        <th>Remain</th>
        <th>%</th>
        <th>Diff</th>
        <th>%</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(r, i) in rows"
        :key="i"
      >
        <td>
          <span
            class="swatch"
            :style="{ backgroundColor: r.color }"
          />
        </td>
        <td>{{ r.name }}</td>
        <td>{{ r.remain.toLocaleString() }}</td>
        <td>{{ r.remainPct.toFixed(1) }}</td>
        <td>{{ r.diff.toLocaleString() }}</td>
        <td>{{ r.diffPct.toFixed(1) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PathwayEventCode } from '@/models/pathway.types'

interface PathStep {
  code: number
  remain: number
  remainPct: number
  diff: number
  diffPct: number
}

const props = defineProps<{
  steps: PathStep[]
  eventCodes: PathwayEventCode[]
  colors: (key: string) => string
}>()

const rows = computed(() =>
  props.steps.map(s => ({
    name: props.eventCodes.find(c => c.code === s.code)?.name ?? String(s.code),
    color: props.colors(String(s.code)),
    remain: s.remain,
    remainPct: s.remainPct,
    diff: s.diff,
    diffPct: s.diffPct,
  }))
)
</script>

<style scoped>
.swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
.path-details {
  width: 100%;
  border-collapse: collapse;
}
.path-details th,
.path-details td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
}
</style>
