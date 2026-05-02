<template>
  <div class="canvas-toolbar">
    <span
      v-if="activeRun"
      class="canvas-toolbar__pill"
    >
      <span class="canvas-toolbar__dot" />
      <strong>#{{ activeRun.id }}</strong>
      · {{ activeRun.sourceKey }}
      <span
        v-if="activeRun.age"
        class="canvas-toolbar__age"
      >· {{ activeRun.age }}</span>
    </span>
    <span
      v-else
      class="canvas-toolbar__pill canvas-toolbar__pill--muted"
    >{{ t('pathway.workbench.noRunsYet', 'No runs yet').value }}</span>

    <span
      v-if="activeRun"
      class="canvas-toolbar__pill"
    >
      <strong>{{ coverage.totalPathwaysCount.toLocaleString() }}</strong>
      {{ t('common.of', 'of').value }} {{ coverage.targetCohortCount.toLocaleString() }}
      ({{ coveragePct.toFixed(1) }}%)
    </span>

    <span class="canvas-toolbar__spacer" />

    <div class="canvas-toolbar__seg">
      <button
        :class="['canvas-toolbar__seg-btn', { 'canvas-toolbar__seg-btn--active': mode === 'visual' }]"
        data-testid="toolbar-mode-visual"
        @click="$emit('update:mode', 'visual')"
      >
        {{ t('cohortDefinitions.costUtilization.visualization', 'Visualization') }}
      </button>
      <button
        :class="['canvas-toolbar__seg-btn', { 'canvas-toolbar__seg-btn--active': mode === 'tabular' }]"
        data-testid="toolbar-mode-tabular"
        @click="$emit('update:mode', 'tabular')"
      >
        {{ t('pathway.results.tabular', 'Tabular') }}
      </button>
    </div>

    <button
      class="canvas-toolbar__icon-btn"
      data-testid="toolbar-generate"
      :title="t('components.generation.generate', 'Generate').value"
      @click="$emit('open-generate')"
    >
      ▶
    </button>
    <button
      class="canvas-toolbar__icon-btn"
      data-testid="toolbar-export"
      :disabled="!activeRun"
      :title="t('common.export', 'Export').value"
      @click="$emit('export')"
    >
      ↓
    </button>
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
  gap: 12px;
  padding: 8px 12px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
}
.canvas-toolbar__pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 999px;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.canvas-toolbar__pill strong { color: rgb(var(--v-theme-on-surface)); }
.canvas-toolbar__pill--muted { opacity: 0.7; }
.canvas-toolbar__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(22, 163, 74);
}
.canvas-toolbar__age { color: rgba(var(--v-theme-on-surface), 0.62); }
.canvas-toolbar__spacer { flex: 1; }
.canvas-toolbar__seg {
  display: flex;
  background: rgba(var(--v-theme-on-surface), 0.04);
  padding: 2px;
  border-radius: 6px;
}
.canvas-toolbar__seg-btn {
  padding: 4px 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
}
.canvas-toolbar__seg-btn--active {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}
.canvas-toolbar__icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), 0.62);
  cursor: pointer;
  font-size: 13px;
}
.canvas-toolbar__icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
