<template>
  <div class="canvas-toolbar">
    <AtlasChip
      v-if="activeRun"
      size="sm"
      class="canvas-toolbar__chip"
    >
      <span class="canvas-toolbar__dot" />
      <strong>#{{ activeRun.id }}</strong>
      <span class="canvas-toolbar__age">· {{ activeRun.sourceKey }}</span>
      <span
        v-if="activeRun.age"
        class="canvas-toolbar__age"
      >· {{ activeRun.age }}</span>
    </AtlasChip>
    <AtlasChip
      v-else
      size="sm"
      variant="outlined"
      class="canvas-toolbar__chip canvas-toolbar__chip--muted"
    >
      {{ t('pathway.workbench.noRunsYet', 'No runs yet').value }}
    </AtlasChip>

    <AtlasChip
      v-if="activeRun"
      size="sm"
      class="canvas-toolbar__chip"
    >
      <strong>{{ coverage.totalPathwaysCount.toLocaleString() }}</strong>
      <span class="canvas-toolbar__age">
        {{ t('common.of', 'of').value }} {{ coverage.targetCohortCount.toLocaleString() }} ({{
          coveragePct.toFixed(1)
        }}%)
      </span>
    </AtlasChip>

    <AtlasSpacer />

    <v-btn-toggle
      :model-value="mode"
      mandatory
      density="compact"
      variant="outlined"
      divided
      @update:model-value="(v: 'visual' | 'tabular' | null) => v && $emit('update:mode', v)"
    >
      <AtlasButton
        toggle
        value="visual"
        size="sm"
        data-testid="toolbar-mode-visual"
      >
        {{ t('cohortDefinitions.costUtilization.visualization', 'Visualization') }}
      </AtlasButton>
      <AtlasButton
        toggle
        value="tabular"
        size="sm"
        data-testid="toolbar-mode-tabular"
      >
        {{ t('pathway.results.tabular', 'Tabular') }}
      </AtlasButton>
    </v-btn-toggle>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasChip, AtlasSpacer } from '@/components/ui'
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'

interface ActiveRun {
  id: number
  sourceKey: string
  age?: string
}
interface Coverage {
  totalPathwaysCount: number
  targetCohortCount: number
}

const props = defineProps<{
  mode: 'visual' | 'tabular'
  activeRun: ActiveRun | null
  coverage: Coverage
}>()

defineEmits<{
  'update:mode': [mode: 'visual' | 'tabular']
}>()

const { t } = useI18n()

const coveragePct = computed(() => {
  if (props.coverage.targetCohortCount === 0) return 0
  return (props.coverage.totalPathwaysCount / props.coverage.targetCohortCount) * 100
})
</script>

<style scoped>
.canvas-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
}
.canvas-toolbar__chip strong {
  font-weight: 600;
}
.canvas-toolbar__chip--muted {
  opacity: 0.7;
}
.canvas-toolbar__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(22, 163, 74);
  margin-right: 4px;
}
.canvas-toolbar__age {
  color: rgba(var(--v-theme-on-surface), 0.62);
  margin-left: 4px;
}
</style>
