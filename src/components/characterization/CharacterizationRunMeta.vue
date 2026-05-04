<template>
  <AtlasCard
    v-if="execution"
    padding="md"
    class="char-run-meta"
    data-testid="char-run-meta"
  >
    <div class="char-run-meta__grid">
      <div class="char-run-meta__field">
        <div class="char-run-meta__label">
          {{ tv('const.newEntityNames.source', 'Source') }}
        </div>
        <div class="char-run-meta__value">
          {{ execution.sourceKey }}
        </div>
      </div>
      <div class="char-run-meta__field">
        <div class="char-run-meta__label">
          {{ tv('columns.started', 'Started') }}
        </div>
        <div class="char-run-meta__value">
          {{ formatTime(execution.startTime) }}
        </div>
      </div>
      <div class="char-run-meta__field">
        <div class="char-run-meta__label">
          {{ tv('columns.finished', 'Completed') }}
        </div>
        <div class="char-run-meta__value">
          {{ formatTime(execution.endTime) }}
        </div>
      </div>
      <div class="char-run-meta__field">
        <div class="char-run-meta__label">
          {{ tv('columns.duration', 'Duration') }}
        </div>
        <div class="char-run-meta__value">
          {{ durationLabel }}
        </div>
      </div>
      <div class="char-run-meta__field">
        <div class="char-run-meta__label">
          {{ tv('columns.results', 'Total rows') }}
        </div>
        <div class="char-run-meta__value">
          {{ resultCount.toLocaleString() }}
        </div>
      </div>
    </div>
  </AtlasCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { formatDateTime } from '@/utils/format'
import { AtlasCard } from '@/components/ui'
import type { CharacterizationExecution } from '@/models/characterization.types'

const props = defineProps<{
  execution: CharacterizationExecution | null
  resultCount: number
}>()

const { tv } = useI18n()

function formatTime(value: number | undefined): string {
  if (typeof value !== 'number' || value <= 0) return '—'
  return formatDateTime(value)
}

const durationLabel = computed<string>(() => {
  const ms = props.execution?.duration
  if (typeof ms !== 'number' || ms < 0) return '—'
  if (ms < 1000) return `${ms} ms`
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
})
</script>

<style scoped>
.char-run-meta { margin-bottom: 0; }
.char-run-meta__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}
.char-run-meta__field { display: flex; flex-direction: column; gap: 2px; }
.char-run-meta__label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.char-run-meta__value { font-size: 0.85rem; font-weight: 500; }
</style>
