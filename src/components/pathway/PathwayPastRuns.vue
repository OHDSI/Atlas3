<template>
  <v-list
    v-if="runs.length > 0"
    density="compact"
    class="past-runs"
    nav
  >
    <v-list-item
      v-for="r in runs"
      :key="r.id"
      :class="['past-run', { 'past-run--active': r.id === activeId }]"
      :active="r.id === activeId"
      :disabled="r.status !== 'COMPLETED'"
      data-testid="past-run-row"
      @click="onClick(r)"
    >
      <template #prepend>
        <span :class="['past-run__status', `past-run__status--${r.status.toLowerCase()}`]" />
      </template>
      <v-list-item-title class="past-run__src">{{ r.sourceKey }}</v-list-item-title>
      <v-list-item-subtitle class="past-run__id">#{{ r.id }}</v-list-item-subtitle>
    </v-list-item>
  </v-list>
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
.past-runs { padding: 0; background: transparent; }
.past-run { min-height: 36px; }
.past-run__id {
  font-family: ui-monospace, "SF Mono", monospace;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.62);
}
.past-run__src { font-size: 12px; font-weight: 600; }
.past-run__status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.2);
  display: inline-block;
}
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
