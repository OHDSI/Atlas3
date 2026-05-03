<template>
  <AtlasList
    v-if="runs.length > 0"
    density="compact"
    class="ir-past-runs"
    nav
  >
    <AtlasListItem
      v-for="r in runs"
      :key="r.id"
      :class="['ir-past-run', { 'ir-past-run--active': r.id === activeId }]"
      :active="r.id === activeId"
      :disabled="!isCompleted(r.status)"
      data-testid="ir-past-run-row"
      @click="onClick(r)"
    >
      <template #prepend>
        <span :class="['ir-past-run__dot', `ir-past-run__dot--${r.status.toLowerCase()}`]" />
      </template>
      <v-list-item-title class="ir-past-run__src">
        {{ r.sourceKey }}
      </v-list-item-title>
      <v-list-item-subtitle class="ir-past-run__id">
        #{{ r.id }}
      </v-list-item-subtitle>
    </AtlasListItem>
  </AtlasList>
  <div
    v-else
    class="ir-past-runs__empty"
    data-testid="ir-past-runs-empty"
  >
    {{ t('common.noData', 'None yet').value }}
  </div>
</template>

<script setup lang="ts">
import { AtlasList, AtlasListItem } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { IncidenceRateExecutionSummary } from '@/stores/incidence-rate'

defineProps<{
  runs: IncidenceRateExecutionSummary[]
  activeId: number | null
}>()
const emit = defineEmits<{ select: [id: number] }>()
const { t } = useI18n()

function isCompleted(s: string): boolean {
  return s === 'COMPLETED' || s === 'COMPLETE'
}

function onClick(r: IncidenceRateExecutionSummary) {
  if (!isCompleted(r.status)) return
  emit('select', r.id)
}
</script>

<style scoped>
.ir-past-runs { padding: 0; background: transparent; }
.ir-past-run { min-height: 36px; }
.ir-past-run__id {
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.62);
}
.ir-past-run__src { font-size: 12px; font-weight: 600; }
.ir-past-run__dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.2);
  display: inline-block;
}
.ir-past-run__dot--completed,
.ir-past-run__dot--complete { background: rgb(22, 163, 74); }
.ir-past-run__dot--failed,
.ir-past-run__dot--canceled { background: rgb(220, 38, 38); }
.ir-past-run__dot--starting,
.ir-past-run__dot--started  { background: rgb(var(--v-theme-orange)); }
.ir-past-runs__empty {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  padding: 8px 0;
}
</style>
