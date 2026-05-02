<template>
  <ul
    v-if="runs.length > 0"
    class="past-runs"
  >
    <li
      v-for="r in runs"
      :key="r.id"
      :class="['past-run', { 'past-run--active': r.id === activeId }]"
      data-testid="past-run-row"
      @click="onClick(r)"
    >
      <span class="past-run__id">#{{ r.id }}</span>
      <span class="past-run__src">{{ r.sourceKey }}</span>
      <span :class="['past-run__status', `past-run__status--${r.status.toLowerCase()}`]" />
    </li>
  </ul>
  <div
    v-else
    class="past-runs__empty"
  >
    {{ t('common.noData', 'None yet').value }}
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { PathwayExecution } from '@/models/pathway.types'

defineProps<{
  runs: PathwayExecution[]
  activeId: number | null
}>()

const emit = defineEmits<{ select: [id: number] }>()
const { t } = useI18n()

function onClick(r: PathwayExecution) {
  if (r.status !== 'COMPLETED') return
  emit('select', r.id)
}
</script>

<style scoped>
.past-runs { list-style: none; margin: 0; padding: 0; }
.past-run {
  display: grid;
  grid-template-columns: 56px 1fr 12px;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11.5px;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.past-run:hover { background: rgba(var(--v-theme-on-surface), 0.04); }
.past-run--active { background: rgba(var(--v-theme-primary), 0.08); }
.past-run__id { font-family: ui-monospace, "SF Mono", monospace; color: rgba(var(--v-theme-on-surface), 0.62); }
.past-run__src {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.past-run__status { width: 8px; height: 8px; border-radius: 50%; background: rgba(var(--v-theme-on-surface), 0.2); }
.past-run__status--completed { background: rgb(22, 163, 74); }
.past-run__status--failed,
.past-run__status--canceled { background: rgb(220, 38, 38); }
.past-run__status--starting,
.past-run__status--started { background: rgb(var(--v-theme-orange)); }
.past-runs__empty {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  padding: 8px 0;
}
</style>
