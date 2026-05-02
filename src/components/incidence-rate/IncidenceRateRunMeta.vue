<template>
  <div
    class="ir-run-meta"
    data-testid="ir-run-meta"
  >
    <span class="ir-run-meta__pill">{{ run.status }}</span>
    <span
      v-if="startedLabel"
      class="muted"
    >· {{ t('ir.results.started', 'Started').value }} {{ startedLabel }}</span>
    <span
      v-if="durationLabel"
      class="muted"
    >· {{ durationLabel }}</span>
    <span
      v-if="run.status === 'FAILED' && run.message"
      data-testid="ir-run-meta-error"
      class="ir-run-meta__err"
    >{{ run.message }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { IncidenceRateExecutionSummary } from '@/stores/incidence-rate'

const props = defineProps<{ run: IncidenceRateExecutionSummary }>()
const { t } = useI18n()

const startedLabel = computed(() => {
  if (!props.run.startTime) return ''
  return new Date(props.run.startTime).toLocaleString()
})

const durationLabel = computed(() => {
  if (!props.run.duration) return ''
  const total = Math.round(props.run.duration / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})
</script>

<style scoped>
.ir-run-meta {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  padding: 4px 0;
}
.ir-run-meta__pill {
  padding: 2px 6px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-weight: 600;
}
.muted { color: rgba(var(--v-theme-on-surface), 0.55); }
.ir-run-meta__err {
  color: rgb(var(--v-theme-error));
}
</style>
