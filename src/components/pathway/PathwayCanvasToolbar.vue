<template>
  <div class="canvas-toolbar">
    <v-chip
      v-if="activeRun"
      size="small"
      variant="tonal"
      class="canvas-toolbar__chip"
    >
      <span class="canvas-toolbar__dot" />
      <strong>#{{ activeRun.id }}</strong>
      <span class="canvas-toolbar__age">· {{ activeRun.sourceKey }}</span>
      <span
        v-if="activeRun.age"
        class="canvas-toolbar__age"
      >· {{ activeRun.age }}</span>
    </v-chip>
    <v-chip
      v-else
      size="small"
      variant="outlined"
      class="canvas-toolbar__chip canvas-toolbar__chip--muted"
    >
      {{ t('pathway.workbench.noRunsYet', 'No runs yet').value }}
    </v-chip>

    <v-chip
      v-if="activeRun"
      size="small"
      variant="tonal"
      class="canvas-toolbar__chip"
    >
      <strong>{{ coverage.totalPathwaysCount.toLocaleString() }}</strong>
      <span class="canvas-toolbar__age">
        {{ t('common.of', 'of').value }} {{ coverage.targetCohortCount.toLocaleString() }}
        ({{ coveragePct.toFixed(1) }}%)
      </span>
    </v-chip>

    <v-spacer />

    <v-btn-toggle
      :model-value="mode"
      mandatory
      density="compact"
      variant="outlined"
      divided
      @update:model-value="(v: 'visual' | 'tabular' | null) => v && $emit('update:mode', v)"
    >
      <v-btn
        value="visual"
        size="small"
        data-testid="toolbar-mode-visual"
      >
        {{ t('cohortDefinitions.costUtilization.visualization', 'Visualization') }}
      </v-btn>
      <v-btn
        value="tabular"
        size="small"
        data-testid="toolbar-mode-tabular"
      >
        {{ t('pathway.results.tabular', 'Tabular') }}
      </v-btn>
    </v-btn-toggle>

    <v-btn
      icon="mdi-play"
      size="small"
      variant="outlined"
      density="compact"
      data-testid="toolbar-generate"
      :title="t('components.generation.generate', 'Generate').value"
      @click="$emit('open-generate')"
    />
    <v-btn
      icon="mdi-download"
      size="small"
      variant="outlined"
      density="compact"
      data-testid="toolbar-export"
      :disabled="!activeRun"
      :title="t('common.export', 'Export').value"
      @click="$emit('export')"
    />
  </div>
</template>

<script setup lang="ts">
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
  'open-generate': []
  'export': []
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
.canvas-toolbar__chip strong { font-weight: 600; }
.canvas-toolbar__chip--muted { opacity: 0.7; }
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
