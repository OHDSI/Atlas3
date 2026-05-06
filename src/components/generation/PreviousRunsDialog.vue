<template>
  <AtlasDialog
    :model-value="modelValue"
    :eyebrow="eyebrowText"
    :title="dialogTitle"
    :max-width="720"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <AtlasDataTable
      :headers="headers"
      :items="rows"
      :loading="loading"
      :hide-default-footer="true"
      :items-per-page="-1"
      :no-data-text="emptyText"
      data-testid="prev-runs-table"
    >
      <template #[`item.date`]="{ item }">
        <span :class="rowClass(item as Row)">{{ (item as Row).date || em }}</span>
      </template>

      <template #[`item.status`]="{ item }">
        <AtlasChip
          :tone="(item as Row).statusTone"
          size="sm"
        >
          {{ (item as Row).status }}
        </AtlasChip>
      </template>

      <template #[`item.duration`]="{ item }">
        <span :class="(item as Row).duration ? '' : 'prd-muted'">{{ (item as Row).duration || em }}</span>
      </template>

      <template #[`item.actions`]="{ item }">
        <AtlasIconButton
          icon="mdi-eye"
          v-bind="{ ariaLabel: viewLabel }"
          variant="text"
          size="sm"
          tone="primary"
          :disabled="(item as Row).status !== 'COMPLETED'"
          :data-testid="`view-btn-${(item as Row).id}`"
          @click="emit('select', (item as Row).id)"
        />
      </template>
    </AtlasDataTable>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  AtlasDialog,
  AtlasDataTable,
  AtlasChip,
  AtlasIconButton,
} from '@/components/ui'
import type { AtlasChipTone } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { GenerationStatus } from '@/models/characterization.types'
import type { RunTableExecution } from './DataSourceRunTable.vue'

interface Props {
  modelValue: boolean
  sourceName: string
  sourceKey: string
  executions: RunTableExecution[]
  selectedId?: number | string | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedId: null,
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [id: number | string]
}>()

const { t, tv } = useI18n()
const em = '—'

const eyebrowText = tv('components.analysisExecution.history', 'HISTORY')
const viewLabel = tv('components.analysisExecution.viewResults', 'View results')
const emptyText = computed(() =>
  t('components.analysisExecution.noPreviousRuns', 'No previous runs.').value
)

const dialogTitle = computed(() => {
  const base = t('components.analysisExecution.previousRuns', 'Previous runs').value
  return `${base} · ${props.sourceName}`
})

const headers = computed(() => [
  { key: 'date', title: t('columns.date', 'Date').value, sortable: false },
  { key: 'status', title: t('columns.status', 'Status').value, sortable: false },
  { key: 'duration', title: t('columns.duration', 'Duration').value, sortable: false },
  { key: 'actions', title: '', sortable: false, align: 'end' as const, width: 80 },
])

const STATUS_TONE: Record<GenerationStatus, AtlasChipTone> = {
  COMPLETED: 'success',
  FAILED: 'danger',
  CANCELED: 'danger',
  STOPPING: 'warning',
  PENDING: 'warning',
  STARTING: 'warning',
  STARTED: 'warning',
  RUNNING: 'warning',
}

function formatDateTime(ms: number | undefined): string {
  if (!ms) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(ms))
  } catch {
    return ''
  }
}

function formatDuration(ms: number | undefined): string {
  if (!ms || ms <= 0) return ''
  if (ms < 1000) return '<1s'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function effectiveDuration(e: RunTableExecution): number | undefined {
  if (typeof e.duration === 'number' && e.duration > 0) return e.duration
  if (typeof e.startTime === 'number' && typeof e.endTime === 'number') {
    return Math.max(0, e.endTime - e.startTime)
  }
  return undefined
}

interface Row {
  id: number | string
  date: string
  status: GenerationStatus
  statusTone: AtlasChipTone
  duration: string
  isSelected: boolean
}

const rows = computed<Row[]>(() =>
  props.executions
    .filter((e) => e.sourceKey === props.sourceKey)
    .slice()
    .sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0))
    .map((e) => ({
      id: e.id,
      date: formatDateTime(e.startTime),
      status: e.status,
      statusTone: STATUS_TONE[e.status],
      duration: formatDuration(effectiveDuration(e)),
      isSelected: props.selectedId !== null && props.selectedId !== undefined && e.id === props.selectedId,
    }))
)

function rowClass(r: Row): string {
  return r.isSelected ? 'prd-row--selected' : ''
}
</script>

<style scoped>
.prd-muted {
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.prd-row--selected {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}
</style>
