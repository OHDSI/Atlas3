<template>
  <div
    v-if="open"
    class="configure-inspector"
    data-testid="configure-inspector"
  >
    <header class="configure-inspector__header">
      <span class="text-eyebrow">{{ t('cc.viewEdit.workbench.configurator.title').value }}</span>
      <AtlasIconButton
        icon="mdi-close"
        size="sm"
        variant="text"
        v-bind="{ ariaLabel: tv('common.close') }"
        data-testid="configure-close"
        @click="$emit('close')"
      />
    </header>

    <section class="configure-inspector__section">
      <div class="configure-inspector__sec-label">
        {{ t('cc.viewEdit.workbench.configurator.rows').value }}
      </div>
      <AtlasSwitch
        :model-value="config.groupByAnalysis"
        :label="t('cc.viewEdit.workbench.configurator.groupByAnalysis').value"
        hide-details
        data-testid="configure-group-by-analysis"
        @update:model-value="(v: boolean | null) => patch({ groupByAnalysis: !!v })"
      />
      <AtlasSwitch
        :model-value="config.pinTopK.enabled"
        :label="t('cc.viewEdit.workbench.configurator.pinTopK').value"
        :disabled="cohortCount !== 2"
        hide-details
        data-testid="configure-pin-topk"
        @update:model-value="(v: boolean | null) => patch({ pinTopK: { ...config.pinTopK, enabled: !!v } })"
      />
      <AtlasTextField
        v-if="config.pinTopK.enabled"
        :model-value="config.pinTopK.k"
        type="number"
        :label="t('cc.viewEdit.workbench.configurator.pinTopKCount').value"
        variant="outlined"
        hide-details
        :min="1"
        :max="100"
        @update:model-value="(v) => patch({ pinTopK: { ...config.pinTopK, k: Math.max(1, Number(v) || 1) } })"
      />
    </section>

    <section class="configure-inspector__section">
      <div class="configure-inspector__sec-label">
        {{ t('cc.viewEdit.workbench.configurator.cells').value }}
      </div>
      <AtlasSelect
        :model-value="config.binaryFormat"
        :items="binaryFormatItems"
        :label="t('cc.viewEdit.workbench.configurator.binaryFormat').value"
        variant="outlined"
        hide-details
        data-testid="configure-binary-format"
        @update:model-value="(v) => patch({ binaryFormat: v as Table1Config['binaryFormat'] })"
      />
      <AtlasSelect
        :model-value="config.continuousFormat"
        :items="continuousFormatItems"
        :label="t('cc.viewEdit.workbench.configurator.continuousFormat').value"
        variant="outlined"
        hide-details
        data-testid="configure-continuous-format"
        @update:model-value="(v) => patch({ continuousFormat: v as Table1Config['continuousFormat'] })"
      />
    </section>

    <section class="configure-inspector__section">
      <div class="configure-inspector__sec-label">
        {{ t('cc.viewEdit.workbench.configurator.columns').value }}
      </div>
      <AtlasSwitch
        :model-value="config.showCounts"
        :label="t('cc.viewEdit.workbench.configurator.showCounts').value"
        hide-details
        data-testid="configure-show-counts"
        @update:model-value="(v: boolean | null) => patch({ showCounts: !!v })"
      />
      <AtlasSwitch
        :model-value="config.showPercent"
        :label="t('cc.viewEdit.workbench.configurator.showPercent').value"
        hide-details
        data-testid="configure-show-percent"
        @update:model-value="(v: boolean | null) => patch({ showPercent: !!v })"
      />
      <AtlasSwitch
        :model-value="config.showStdDiff"
        :label="t('cc.viewEdit.workbench.configurator.showStdDiff').value"
        :disabled="cohortCount !== 2"
        hide-details
        data-testid="configure-stddiff"
        @update:model-value="(v: boolean | null) => patch({ showStdDiff: !!v })"
      />
      <AtlasSwitch
        :model-value="config.showStdDiffCI"
        :label="t('cc.viewEdit.workbench.configurator.showStdDiffCI').value"
        :disabled="cohortCount !== 2 || !config.showStdDiff"
        hide-details
        data-testid="configure-stddiff-ci"
        @update:model-value="(v: boolean | null) => patch({ showStdDiffCI: !!v })"
      />
      <AtlasSwitch
        :model-value="config.strataAsCols"
        :label="t('cc.viewEdit.workbench.configurator.strataAsCols').value"
        :disabled="!hasStrata"
        hide-details
        data-testid="configure-strata-as-cols"
        @update:model-value="(v: boolean | null) => patch({ strataAsCols: !!v })"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { AtlasIconButton, AtlasSelect, AtlasSwitch, AtlasTextField } from '@/components/ui'
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { Table1Config } from '@/models/characterization.types'

const props = defineProps<{
  open: boolean
  config: Table1Config
  cohortCount: number
  hasStrata: boolean
}>()

const emit = defineEmits<{
  'update:config': [next: Table1Config]
  close: []
}>()

const { t, tv } = useI18n()

const binaryFormatItems = computed(() => [
  { title: tv('cc.viewEdit.workbench.binaryFormat.countPct'), value: 'count-pct' },
  { title: tv('cc.viewEdit.workbench.binaryFormat.pct'), value: 'pct' },
  { title: tv('cc.viewEdit.workbench.binaryFormat.count'), value: 'count' },
  { title: tv('cc.viewEdit.workbench.binaryFormat.countOfTotal'), value: 'count-of-total' },
])

const continuousFormatItems = computed(() => [
  { title: tv('cc.viewEdit.workbench.continuousFormat.meanSd'), value: 'mean-sd' },
  { title: tv('cc.viewEdit.workbench.continuousFormat.medianIqr'), value: 'median-iqr' },
])

function patch(partial: Partial<Table1Config>): void {
  emit('update:config', { ...props.config, ...partial })
}
</script>

<style scoped>
.configure-inspector {
  width: 320px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.10);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 12px;
  display: flex; flex-direction: column; gap: 12px;
}
.configure-inspector__header {
  display: flex; align-items: center; justify-content: space-between;
}
.configure-inspector__section { display: flex; flex-direction: column; gap: 6px; }
.configure-inspector :deep(.v-field__input),
.configure-inspector :deep(.v-label),
.configure-inspector :deep(.v-selection-control .v-label) {
  font-size: 12px;
}
.configure-inspector__sec-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.62);
}
</style>
