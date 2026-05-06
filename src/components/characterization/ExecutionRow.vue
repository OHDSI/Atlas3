<!--
  ExecutionRow

  One row in the executions list. Shows source, status chip, start time
  and duration. Cancel is only offered for non-terminal executions; the
  Results button only shows once an execution has COMPLETED.
-->
<template>
  <div
    class="execution-row"
    :data-testid="`execution-row-${execution.id}`"
  >
    <div class="execution-row__cell execution-row__source">
      <AtlasIcon
        size="small"
        class="me-2"
      >
        mdi-database
      </AtlasIcon>
      <span>{{ execution.sourceKey }}</span>
    </div>

    <div class="execution-row__cell">
      <AtlasChip
        :tone="statusTone"
        size="sm"
        variant="flat"
        :data-testid="`execution-row-status-${execution.id}`"
      >
        {{ execution.status }}
      </AtlasChip>
    </div>

    <div class="execution-row__cell execution-row__start">
      {{ formattedStart }}
    </div>

    <div class="execution-row__cell execution-row__duration">
      {{ formattedDuration }}
    </div>

    <div class="execution-row__cell execution-row__actions">
      <AtlasButton
        v-if="!isTerminal"
        size="sm"
        variant="secondary"
        tone="warning"
        icon="mdi-cancel"
        :data-testid="`execution-row-cancel-${execution.id}`"
        @click="onCancel"
      >
        {{ t('common.cancel', 'Cancel') }}
      </AtlasButton>
      <AtlasButton
        v-if="isCompleted"
        variant="secondary"
        size="sm"
        icon="mdi-chart-bar"
        :data-testid="`execution-row-results-${execution.id}`"
        @click="onViewResults"
      >
        {{ t('cohortDefinitions.cohortDefinitionManager.panels.viewReports', 'View results') }}
      </AtlasButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasChip, AtlasIcon } from '@/components/ui'
import type { AtlasChipTone } from '@/components/ui'
import { computed } from 'vue'

import { useI18n } from '@/composables/useI18n'
import { isTerminalStatus } from '@/composables/useExecutionPolling'
import type { CharacterizationExecution, GenerationStatus } from '@/models/characterization.types'

interface Props {
  execution: CharacterizationExecution
  characterizationId: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  cancel: [generationId: number]
  viewResults: [generationId: number]
}>()

const { t } = useI18n()

const isTerminal = computed<boolean>(() => isTerminalStatus(props.execution.status))
const isCompleted = computed<boolean>(() => props.execution.status === 'COMPLETED')

const STATUS_TONES: Record<GenerationStatus, AtlasChipTone> = {
  PENDING: 'info',
  STARTING: 'info',
  STARTED: 'info',
  RUNNING: 'info',
  COMPLETED: 'success',
  FAILED: 'danger',
  CANCELED: 'danger',
  STOPPING: 'danger',
}

const statusTone = computed<AtlasChipTone>(() => STATUS_TONES[props.execution.status] ?? 'neutral')

function formatTimestamp(ts: number | undefined): string {
  if (ts == null) return '—'
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return '—'
  }
}

function formatDurationMs(ms: number | undefined): string {
  if (ms == null || ms < 0) return '—'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return `${hours}h ${remMinutes}m`
}

const formattedStart = computed<string>(() => formatTimestamp(props.execution.startTime))

const formattedDuration = computed<string>(() => {
  if (props.execution.duration != null) {
    return formatDurationMs(props.execution.duration)
  }
  if (props.execution.startTime != null && props.execution.endTime != null) {
    return formatDurationMs(props.execution.endTime - props.execution.startTime)
  }
  return '—'
})

function onCancel() {
  emit('cancel', props.execution.id)
}

function onViewResults() {
  emit('viewResults', props.execution.id)
}
</script>

<style scoped>
.execution-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1.5fr 1fr 2fr;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.execution-row:last-child {
  border-bottom: none;
}

.execution-row__source {
  display: flex;
  align-items: center;
  font-weight: 500;
}

.execution-row__start,
.execution-row__duration {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.7);
}

.execution-row__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
</style>
