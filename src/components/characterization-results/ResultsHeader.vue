<!--
  ResultsHeader

  Execution metadata + the prevalence threshold slider for the results
  viewer. Pure presentation: state lives in the parent view, this
  component just emits `update:threshold`.
-->
<template>
  <v-card
    class="results-header"
    variant="outlined"
    data-testid="char-results-header"
  >
    <v-card-text>
      <div class="results-header__meta">
        <div class="results-header__field">
          <div class="results-header__label">
            {{ tv('const.newEntityNames.source', 'Source') }}
          </div>
          <div class="results-header__value">
            {{ execution?.sourceKey ?? '—' }}
          </div>
        </div>
        <div class="results-header__field">
          <div class="results-header__label">
            {{ tv('columns.started', 'Started') }}
          </div>
          <div class="results-header__value">
            {{ formatTime(execution?.startTime) }}
          </div>
        </div>
        <div class="results-header__field">
          <div class="results-header__label">
            {{ tv('columns.finished', 'Completed') }}
          </div>
          <div class="results-header__value">
            {{ formatTime(execution?.endTime) }}
          </div>
        </div>
        <div class="results-header__field">
          <div class="results-header__label">
            {{ tv('columns.duration', 'Duration') }}
          </div>
          <div class="results-header__value">
            {{ durationLabel }}
          </div>
        </div>
        <div class="results-header__field">
          <div class="results-header__label">
            {{ tv('cc.viewEdit.results.detail.design', 'Design Hash') }}
          </div>
          <div
            class="results-header__value results-header__value--mono"
            :title="execution?.designHash ?? ''"
          >
            {{ shortHash }}
          </div>
        </div>
        <div class="results-header__field">
          <div class="results-header__label">
            {{ tv('columns.results', 'Total rows') }}
          </div>
          <div class="results-header__value">
            {{ resultCount }}
          </div>
        </div>
      </div>

      <div class="results-header__threshold">
        <v-slider
          :model-value="threshold"
          :min="0"
          :max="100"
          :step="1"
          color="primary"
          thumb-label="always"
          hide-details
          data-testid="char-results-threshold"
          @update:model-value="onThreshold"
        >
          <template #prepend>
            <span class="results-header__threshold-label">
              {{
                tv(
                  'cc.viewEdit.results.threshold.label',
                  'Show covariates with prevalence ≥ {n}%',
                  { n: threshold }
                )
              }}
            </span>
          </template>
        </v-slider>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@/composables/useI18n'
import type { CharacterizationExecution } from '@/models/characterization.types'
import { formatDateTime } from '@/utils/format'

interface Props {
  execution: CharacterizationExecution | null
  resultCount: number
  threshold: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:threshold', value: number): void
}>()

const { tv } = useI18n()

function formatTime(value: number | undefined): string {
  if (typeof value !== 'number' || value <= 0) {
    return '—'
  }
  return formatDateTime(value)
}

const durationLabel = computed<string>(() => {
  const ms = props.execution?.duration
  if (typeof ms !== 'number' || ms < 0) {
    return '—'
  }
  if (ms < 1000) {
    return `${ms} ms`
  }
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remSeconds = seconds % 60
  return `${minutes}m ${remSeconds}s`
})

const shortHash = computed<string>(() => {
  const hash = props.execution?.designHash
  if (!hash) {
    return '—'
  }
  return hash.length > 12 ? `${hash.slice(0, 12)}…` : hash
})

function onThreshold(value: number | number[]): void {
  // v-slider can emit an array when ranged; we always render single-value.
  const next = Array.isArray(value) ? value[0] : value
  if (typeof next === 'number') {
    emit('update:threshold', next)
  }
}
</script>

<style scoped>
.results-header {
  margin-bottom: 16px;
}

.results-header__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.results-header__field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.results-header__label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.results-header__value {
  font-size: 0.95rem;
  font-weight: 500;
}

.results-header__value--mono {
  font-family: var(--v-font-family-monospace, monospace);
}

.results-header__threshold {
  padding-top: 8px;
}

.results-header__threshold-label {
  font-size: 0.85rem;
  white-space: nowrap;
}
</style>
