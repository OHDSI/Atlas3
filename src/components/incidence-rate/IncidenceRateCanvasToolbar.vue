<template>
  <div class="ir-toolbar">
    <AtlasChip
      v-if="activeRun"
      size="sm"
      class="ir-toolbar__chip"
      data-testid="ir-toolbar-run-chip"
    >
      <span class="ir-toolbar__dot" />
      <strong>#{{ activeRun.id }}</strong>
      <span class="muted">· {{ activeRun.sourceKey }}</span>
    </AtlasChip>
    <v-chip
      v-else
      size="small"
      variant="outlined"
      class="ir-toolbar__chip ir-toolbar__chip--muted"
      data-testid="ir-toolbar-run-chip"
    >
      {{ t('ir.workbench.noRunsYet', 'No runs yet').value }}
    </v-chip>

    <AtlasMenu offset="6">
      <template #activator="{ props: ap }">
        <v-chip
          v-bind="ap"
          size="small"
          variant="outlined"
          data-testid="ir-toolbar-target-chip"
        >
          <strong>{{ t('columns.target', 'Target').value }}:</strong>
          <span class="muted">&nbsp;{{ targetLabel }}</span>
        </v-chip>
      </template>
      <AtlasList density="compact">
        <AtlasListItem
          v-for="opt in availableTargets"
          :key="opt.id"
          @click="$emit('update:selectedTargetId', opt.id)"
        >
          <v-list-item-title>
            {{ opt.name }}
          </v-list-item-title>
        </AtlasListItem>
      </AtlasList>
    </AtlasMenu>

    <AtlasMenu offset="6">
      <template #activator="{ props: ap }">
        <v-chip
          v-bind="ap"
          size="small"
          variant="outlined"
          data-testid="ir-toolbar-outcome-chip"
        >
          <strong>{{ t('columns.outcome', 'Outcome').value }}:</strong>
          <span class="muted">&nbsp;{{ outcomeLabel }}</span>
        </v-chip>
      </template>
      <AtlasList density="compact">
        <AtlasListItem
          v-for="o in availableOutcomes"
          :key="o.id"
          @click="$emit('update:selectedOutcomeId', o.id)"
        >
          <v-list-item-title>
            {{ o.name }}
          </v-list-item-title>
        </AtlasListItem>
      </AtlasList>
    </AtlasMenu>

    <AtlasMenu offset="6">
      <template #activator="{ props: ap }">
        <v-chip
          v-bind="ap"
          size="small"
          variant="outlined"
          data-testid="ir-toolbar-mult-chip"
        >
          <strong>×</strong>
          <span class="muted">&nbsp;{{ multiplier.toLocaleString() }}</span>
        </v-chip>
      </template>
      <AtlasList density="compact">
        <AtlasListItem
          v-for="m in MULTIPLIER_OPTIONS"
          :key="m"
          @click="$emit('update:multiplier', m)"
        >
          <v-list-item-title>
            × {{ m.toLocaleString() }}
          </v-list-item-title>
        </AtlasListItem>
      </AtlasList>
    </AtlasMenu>

    <AtlasSpacer />

    <v-btn-toggle
      :model-value="mode"
      mandatory
      density="compact"
      variant="outlined"
      divided
      @update:model-value="(v: 'treemap' | 'table' | null) => v && $emit('update:mode', v)"
    >
      <v-btn
        value="treemap"
        size="small"
        data-testid="ir-toolbar-mode-treemap"
      >
        {{ t('ir.workbench.treemap', 'Treemap').value }}
      </v-btn>
      <v-btn
        value="table"
        size="small"
        data-testid="ir-toolbar-mode-table"
      >
        {{ t('pathway.results.tabular', 'Table').value }}
      </v-btn>
    </v-btn-toggle>

    <AtlasMenu offset="6">
      <template #activator="{ props: ap }">
        <AtlasButton
          v-bind="ap"
          variant="ghost"
          size="sm"
          icon="mdi-download-outline"
          :disabled="!hasResults"
          data-testid="ir-toolbar-export"
        >
          {{ t('cc.viewEdit.results.exportAll', 'Export').value }}
        </AtlasButton>
      </template>
      <AtlasList density="compact">
        <AtlasListItem @click="$emit('export', 'csv')">
          <v-list-item-title>
            CSV
          </v-list-item-title>
        </AtlasListItem>
        <AtlasListItem @click="$emit('export', 'svg')">
          <v-list-item-title>
            SVG
          </v-list-item-title>
        </AtlasListItem>
        <AtlasListItem @click="$emit('export', 'png')">
          <v-list-item-title>
            PNG
          </v-list-item-title>
        </AtlasListItem>
      </AtlasList>
    </AtlasMenu>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasChip, AtlasList, AtlasListItem, AtlasMenu, AtlasSpacer } from '@/components/ui'
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { RATE_MULTIPLIER_OPTIONS, type RateMultiplier } from '@/models/incidence-rate.types'
import type { IncidenceRateExecutionSummary } from '@/stores/incidence-rate'

export type ViewMode = 'treemap' | 'table'

const props = defineProps<{
  mode: ViewMode
  activeRun: IncidenceRateExecutionSummary | null
  selectedTargetId: number | null
  selectedOutcomeId: number | null
  multiplier: number
  availableTargets: { id: number; name: string }[]
  availableOutcomes: { id: number; name: string }[]
  hasResults: boolean
}>()

defineEmits<{
  'update:mode': [m: ViewMode]
  'update:selectedTargetId': [id: number]
  'update:selectedOutcomeId': [id: number]
  'update:multiplier': [m: RateMultiplier]
  export: [format: 'csv' | 'svg' | 'png']
}>()

const { t } = useI18n()
const MULTIPLIER_OPTIONS = RATE_MULTIPLIER_OPTIONS

const targetLabel = computed(
  () => props.availableTargets.find(o => o.id === props.selectedTargetId)?.name ?? '—'
)
const outcomeLabel = computed(
  () => props.availableOutcomes.find(o => o.id === props.selectedOutcomeId)?.name ?? '—'
)
</script>

<style scoped>
.ir-toolbar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 6px 10px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
}
.ir-toolbar__chip strong { font-weight: 600; }
.ir-toolbar__chip--muted { opacity: 0.7; }
.ir-toolbar__dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgb(22, 163, 74); margin-right: 4px;
}
.muted { color: rgba(var(--v-theme-on-surface), 0.62); }
</style>
