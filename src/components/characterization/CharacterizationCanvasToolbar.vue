<template>
  <div class="char-toolbar">
    <v-btn-toggle
      :model-value="mode"
      mandatory
      density="compact"
      variant="outlined"
      divided
      @update:model-value="(v: ViewMode | null) => v && $emit('update:mode', v)"
    >
      <AtlasButton
        toggle
        value="perAnalysis"
        size="sm"
        data-testid="char-toolbar-mode-perAnalysis"
      >
        {{ t('cc.viewEdit.workbench.modePerAnalysis', 'Per-analysis').value }}
      </AtlasButton>
      <AtlasButton
        toggle
        value="table1"
        size="sm"
        data-testid="char-toolbar-mode-table1"
      >
        {{ t('cc.viewEdit.workbench.modeTable1', 'Baseline').value }}
      </AtlasButton>
    </v-btn-toggle>

    <AtlasChip
      v-if="activeRun"
      size="sm"
      class="char-toolbar__chip"
      data-testid="char-toolbar-run-chip"
    >
      <strong>#{{ activeRun.id }}</strong>
      <span class="char-toolbar__muted">· {{ activeRun.sourceKey }}</span>
      <span
        v-if="activeRun.personCount"
        class="char-toolbar__muted"
      >
        · {{ activeRun.personCount.toLocaleString() }} {{ tv('columns.results', 'rows').toLowerCase() }}
      </span>
    </AtlasChip>

    <AtlasTextField
      :model-value="threshold"
      :label="t('cc.viewEdit.results.thresholdLabel', 'Threshold ≥').value"
      type="number"
      variant="outlined"
      hide-details
      class="char-toolbar__threshold"
      :min="0"
      :max="100"
      data-testid="char-toolbar-threshold"
      @update:model-value="(v) => $emit('update:threshold', Number(v) || 0)"
    />

    <AtlasSpacer />

    <AtlasButton
      size="sm"
      variant="secondary"
      icon="mdi-tune-variant"
      data-testid="char-toolbar-configure"
      @click="$emit('open-configure')"
    >
      {{ t('cc.viewEdit.workbench.configure', 'Configure').value }}
    </AtlasButton>
    <AtlasButton
      variant="ghost"
      size="sm"
      icon="mdi-download-outline"
      :disabled="!hasResults"
      data-testid="char-toolbar-export"
      @click="$emit('export')"
    >
      {{ t('cc.viewEdit.results.exportAll', 'Export CSV').value }}
    </AtlasButton>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasChip, AtlasSpacer, AtlasTextField } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'

export type ViewMode = 'table1' | 'perAnalysis'

interface ActiveRun {
  id: number
  sourceKey: string
  personCount?: number
}

defineProps<{
  mode: ViewMode
  activeRun: ActiveRun | null
  threshold: number
  hasResults: boolean
}>()

defineEmits<{
  'update:mode': [mode: ViewMode]
  'update:threshold': [value: number]
  'open-configure': []
  'export': []
}>()

const { t, tv } = useI18n()
</script>

<style scoped>
.char-toolbar {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
  flex-wrap: wrap;
}
.char-toolbar__chip strong { font-weight: 600; }
.char-toolbar__muted { color: rgba(var(--v-theme-on-surface), 0.62); margin-left: 4px; }
.char-toolbar__threshold { max-width: 120px; }
</style>
