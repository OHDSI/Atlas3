<template>
  <AtlasList
    v-if="runs.length > 0"
    density="compact"
    class="char-past-runs"
    nav
  >
    <AtlasListItem
      v-for="r in runs"
      :key="r.id"
      :class="['char-past-run', { 'char-past-run--active': r.id === activeId }]"
      :active="r.id === activeId"
      :disabled="r.status !== 'COMPLETED'"
      data-testid="char-past-run-row"
      @click="onClick(r)"
    >
      <template #prepend>
        <span
          :class="['char-past-run__status', `char-past-run__status--${r.status.toLowerCase()}`]"
        />
      </template>
      <v-list-item-title class="char-past-run__src">
        {{ r.sourceKey }}
      </v-list-item-title>
      <v-list-item-subtitle class="char-past-run__id">
        #{{ r.id }}
      </v-list-item-subtitle>
    </AtlasListItem>
  </AtlasList>
  <div
    v-else
    class="char-past-runs__empty"
  >
    {{ t('common.noData', 'None yet').value }}
  </div>
</template>

<script setup lang="ts">
import { AtlasList, AtlasListItem } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { CharacterizationExecution } from '@/models/characterization.types'

defineProps<{
  runs: CharacterizationExecution[]
  activeId: number | null
}>()

const emit = defineEmits<{ select: [id: number] }>()
const { t } = useI18n()

function onClick(r: CharacterizationExecution) {
  if (r.status !== 'COMPLETED') return
  emit('select', r.id)
}
</script>

<style scoped>
.char-past-runs {
  padding: 0;
  background: transparent;
}
.char-past-run {
  min-height: 36px;
}
.char-past-run__id {
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.62);
}
.char-past-run__src {
  font-size: 12px;
  font-weight: 600;
}
.char-past-run__status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.2);
  display: inline-block;
}
.char-past-run__status--completed {
  background: rgb(22, 163, 74);
}
.char-past-run__status--failed,
.char-past-run__status--canceled {
  background: rgb(220, 38, 38);
}
.char-past-run__status--starting,
.char-past-run__status--started,
.char-past-run__status--running {
  background: rgb(var(--v-theme-orange));
}
.char-past-runs__empty {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  padding: 8px 0;
}
</style>
