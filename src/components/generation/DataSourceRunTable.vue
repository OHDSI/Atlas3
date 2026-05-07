<template>
  <AtlasDataTable
    :headers="headers"
    :items="rows"
    :loading="loading"
    :hide-default-footer="true"
    :items-per-page="-1"
    :no-data-text="noSourcesText ?? defaultNoSourcesText"
    data-testid="ds-run-table"
  >
    <template #[`item.source`]="{ item }">
      <div class="dsrt-source">
        <div class="dsrt-source__name">
          {{ (item as Row).sourceName }}
        </div>
        <div
          v-if="(item as Row).showKey"
          class="dsrt-source__key"
        >
          {{ (item as Row).sourceKey }}
        </div>
      </div>
    </template>

    <template #[`item.status`]="{ item }">
      <div class="dsrt-status">
        <AtlasProgressCircular
          v-if="(item as Row).statusKind === 'running'"
          indeterminate
          size="16"
          width="2"
          color="warning"
        />
        <AtlasChip
          v-if="(item as Row).statusKind !== 'none'"
          :tone="(item as Row).statusTone"
          size="sm"
        >
          {{ (item as Row).statusLabel }}
        </AtlasChip>
        <span
          v-else
          class="dsrt-muted"
        >{{ noRunText }}</span>
      </div>
    </template>

    <template #[`item.patients`]="{ item }">
      <span :class="(item as Row).personCount === undefined ? 'dsrt-muted' : 'dsrt-pcount'">
        {{ (item as Row).personCount !== undefined ? (item as Row).personCount!.toLocaleString() : em }}
      </span>
    </template>

    <template #[`item.lastRun`]="{ item }">
      <span :class="(item as Row).lastRun ? '' : 'dsrt-muted'">
        {{ (item as Row).lastRun || em }}
      </span>
    </template>

    <template #[`item.duration`]="{ item }">
      <span :class="(item as Row).duration ? '' : 'dsrt-muted'">
        {{ (item as Row).duration || em }}
      </span>
    </template>

    <template #[`item.actions`]="{ item }">
      <div class="dsrt-actions-cell">
        <DataSourceRunRow
          :source-key="(item as Row).sourceKey"
          :latest-status="(item as Row).latestStatus"
          :history-count="(item as Row).count"
          :run-disabled="runDisabled"
          :run-disabled-reason="runDisabledReason"
          :hide-cancel="hideCancel"
          @run="$emit('run', (item as Row).sourceKey)"
          @cancel="$emit('cancel', (item as Row).sourceKey)"
          @show-history="$emit('show-history', (item as Row).sourceKey)"
        />
        <AtlasButton
          v-for="action in extraActions"
          :key="action.key"
          size="sm"
          variant="secondary"
          :icon="action.icon"
          :disabled="action.disabledWhen ? action.disabledWhen(item as Row) : false"
          :data-testid="`row-extra-${action.key}-${(item as Row).sourceKey}`"
          @click="onExtraClick(action.key, (item as Row).sourceKey)"
        >
          {{ action.label }}
        </AtlasButton>
      </div>
    </template>
  </AtlasDataTable>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasButton, AtlasDataTable, AtlasChip, AtlasProgressCircular } from '@/components/ui'
import type { AtlasChipTone } from '@/components/ui'
import DataSourceRunRow from './DataSourceRunRow.vue'
import { useI18n } from '@/composables/useI18n'
import type { GenerationStatus } from '@/models/characterization.types'

export interface RunTableSource {
  sourceKey: string
  sourceName: string
}

export interface RunTableExecution {
  id: number | string
  sourceKey: string
  status: GenerationStatus
  startTime?: number
  endTime?: number
  duration?: number
  personCount?: number
}

export interface ExtraAction {
  key: string
  label: string
  icon?: string
  disabledWhen?: (row: Row) => boolean
}

interface Props {
  sources: RunTableSource[]
  executions: RunTableExecution[]
  loading?: boolean
  runDisabled?: boolean
  runDisabledReason?: string
  noSourcesText?: string
  showPatientCount?: boolean
  extraActions?: ExtraAction[]
  hideCancel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  runDisabled: false,
  runDisabledReason: '',
  noSourcesText: undefined,
  showPatientCount: false,
  extraActions: () => [],
  hideCancel: false,
})

const emit = defineEmits<{
  run: [sourceKey: string]
  cancel: [sourceKey: string]
  'show-history': [sourceKey: string]
  'extra-action': [actionKey: string, sourceKey: string]
}>()

function onExtraClick(actionKey: string, sourceKey: string) {
  emit('extra-action', actionKey, sourceKey)
}

const { t, tv } = useI18n()
const em = '—'

interface TableHeader {
  key: string
  title?: string
  sortable?: boolean
  align?: 'start' | 'center' | 'end'
  width?: number | string
  [k: string]: unknown
}

const headers = computed<TableHeader[]>(() => {
  const h: TableHeader[] = [
    { key: 'source', title: t('columns.sourceName', 'Data source').value, sortable: false },
    { key: 'status', title: t('columns.status', 'Status').value, sortable: false },
  ]
  if (props.showPatientCount) {
    h.push({ key: 'patients', title: t('columns.patients', 'Patients').value, sortable: false, align: 'end' })
  }
  h.push(
    { key: 'lastRun', title: t('columns.lastRun', 'Last run').value, sortable: false },
    { key: 'duration', title: t('columns.duration', 'Duration').value, sortable: false },
    { key: 'actions', title: '', sortable: false, align: 'end', width: 280 }
  )
  return h
})

const noRunText = computed(() => t('components.analysisExecution.notRun', 'Not run').value)
const defaultNoSourcesText = tv('components.analysisExecution.noSources', 'No data sources available')

type StatusKind = 'none' | 'success' | 'error' | 'warning' | 'running'

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

const STATUS_KIND: Record<GenerationStatus, StatusKind> = {
  COMPLETED: 'success',
  FAILED: 'error',
  CANCELED: 'error',
  STOPPING: 'warning',
  PENDING: 'running',
  STARTING: 'running',
  STARTED: 'running',
  RUNNING: 'running',
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
  sourceKey: string
  sourceName: string
  showKey: boolean
  latestStatus?: GenerationStatus
  statusLabel: string
  statusTone: AtlasChipTone
  statusKind: StatusKind
  lastRun: string
  duration: string
  count: number
  personCount?: number
}

const latestBySource = computed(() => {
  const sorted = [...props.executions].sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0))
  const map = new Map<string, RunTableExecution>()
  for (const e of sorted) {
    if (!map.has(e.sourceKey)) map.set(e.sourceKey, e)
  }
  return map
})

const countBySource = computed(() => {
  const map = new Map<string, number>()
  for (const e of props.executions) {
    map.set(e.sourceKey, (map.get(e.sourceKey) ?? 0) + 1)
  }
  return map
})

const rows = computed<Row[]>(() =>
  props.sources.map((s) => {
    const latest = latestBySource.value.get(s.sourceKey)
    const status = latest?.status
    const kind: StatusKind = status ? STATUS_KIND[status] : 'none'
    return {
      sourceKey: s.sourceKey,
      sourceName: s.sourceName || s.sourceKey,
      showKey: !!(s.sourceName && s.sourceName !== s.sourceKey),
      latestStatus: status,
      statusLabel: status ?? '',
      statusTone: status ? STATUS_TONE[status] : 'neutral',
      statusKind: kind,
      lastRun: formatDateTime(latest?.startTime),
      duration: latest ? formatDuration(effectiveDuration(latest)) : '',
      count: countBySource.value.get(s.sourceKey) ?? 0,
      personCount: latest?.personCount,
    }
  })
)
</script>

<style scoped>
.dsrt-source__name {
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
}
.dsrt-source__key {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.62);
}
.dsrt-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.dsrt-muted {
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.dsrt-actions-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
  width: 100%;
  flex-wrap: nowrap;
}
.dsrt-pcount {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}
</style>
