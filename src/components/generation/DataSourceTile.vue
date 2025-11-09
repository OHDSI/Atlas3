<template>
  <v-card
    class="data-source-tile"
    :class="`data-source-tile--${tileStatus}`"
    @click="handleTileClick"
  >
    <v-card-title class="data-source-tile__title">
      {{ source.sourceName }}
    </v-card-title>

    <v-card-subtitle class="data-source-tile__subtitle">
      {{ source.sourceKey }}
    </v-card-subtitle>

    <v-card-text class="data-source-tile__content">
      <!-- Status display -->
      <div v-if="tileStatus === 'idle'" class="tile-status">
        {{ t('common.readyToGenerate', 'Ready to generate') }}
      </div>

      <div v-else-if="tileStatus === 'generating'" class="tile-status tile-status--generating">
        <v-progress-circular
          indeterminate
          size="24"
          width="2"
          color="primary"
        />
        <span class="ml-2">{{ statusText }}</span>
      </div>

      <div v-else-if="tileStatus === 'complete'" class="tile-status tile-status--complete">
        <div class="patient-count">
          <div class="patient-count__number">{{ patientCount?.toLocaleString() || '0' }}</div>
          <div class="patient-count__label">{{ t('common.patients', 'Patients') }}</div>
        </div>
        <v-chip
          size="small"
          color="primary"
          variant="outlined"
          class="mt-2"
        >
          {{ t('common.clickToViewReports', 'Click to view reports') }}
        </v-chip>
      </div>

      <div v-else-if="tileStatus === 'failed'" class="tile-status tile-status--failed">
        <v-icon color="error">mdi-alert-circle</v-icon>
        <span class="ml-2 text-error">{{ failMessage || t('common.failed', 'Failed').value }}</span>
      </div>
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <v-btn
        v-if="canGenerate"
        color="primary"
        variant="flat"
        :disabled="!cohortId"
        :loading="tileStatus === 'generating'"
        @click.stop="handleGenerate"
      >
        {{ tileStatus === 'complete' ? t('common.regenerate', 'Regenerate').value : t('common.generate', 'Generate').value }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useWebAPIStore } from '@/stores/webapi'
import type { CDMSource, TileStatus } from '@/models/webapi.types'

const { t } = useI18n()

interface Props {
  source: CDMSource
  cohortId: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'tile-click': [sourceKey: string]
}>()

const webapiStore = useWebAPIStore()

const job = computed(() => {
  if (!props.cohortId) return undefined
  return webapiStore.getJobsByCohortId(props.cohortId)
    .find(j => j.sourceKey === props.source.sourceKey)
})

const tileStatus = computed((): TileStatus => {
  if (!job.value) return 'idle'
  switch (job.value.status) {
    case 'PENDING':
    case 'RUNNING':
      return 'generating'
    case 'COMPLETE':
      return 'complete'
    case 'FAILED':
      return 'failed'
    default:
      return 'idle'
  }
})

const patientCount = computed(() => job.value?.personCount)

const statusText = computed(() => {
  if (!job.value) return ''
  if (job.value.status === 'PENDING') return 'Starting generation...'
  if (job.value.status === 'RUNNING') return 'Running...'
  return 'Generating...'
})

const failMessage = computed(() => job.value?.failMessage)

const canGenerate = computed(() => {
  return tileStatus.value === 'idle' ||
         tileStatus.value === 'complete' ||
         tileStatus.value === 'failed'
})

async function handleGenerate() {
  if (!props.cohortId) return

  try {
    await webapiStore.generateCohort(props.cohortId, props.source.sourceKey)
  } catch (error) {
    console.error('Generation error:', error)
    // Error will be displayed by the store or parent component
  }
}

// T048: Emit tile-click event when card is clicked (for viewing reports)
function handleTileClick() {
  // Only emit if cohort has been generated (complete status)
  if (tileStatus.value === 'complete') {
    emit('tile-click', props.source.sourceKey)
  }
}
</script>

<style scoped>
/* Reuse CohortCard styles for consistency */
.data-source-tile {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  border-radius: 4px;
  transition: all 0.2s ease-in-out;
  height: 100%;
  min-height: 180px;
}

.data-source-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.18);
}

.data-source-tile--complete {
  cursor: pointer;
}

.data-source-tile__title {
  font-size: 0.9375rem;
  font-weight: 400;
  color: #1f425a;
}

.data-source-tile__subtitle {
  font-size: 0.8125rem;
  color: #666;
}

.data-source-tile__content {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tile-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tile-status--complete {
  flex-direction: column;
}

.patient-count {
  text-align: center;
}

.patient-count__number {
  font-size: 2rem;
  font-weight: 600;
  color: #1f425a;
  line-height: 1;
}

.patient-count__label {
  font-size: 0.875rem;
  color: #666;
  margin-top: 4px;
}
</style>
