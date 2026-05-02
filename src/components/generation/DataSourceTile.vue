<template>
  <v-card
    class="data-source-tile"
    :class="`data-source-tile--${tileStatus}`"
    @click="handleTileClick"
  >
    <v-card-text class="data-source-tile__content pa-3">
      <!-- Source name and key -->
      <div class="tile-header mb-2">
        <div class="tile-header__name">
          {{ source.sourceName }}
        </div>
        <div class="tile-header__key">
          {{ source.sourceKey }}
        </div>
      </div>

      <!-- Status display -->
      <div
        v-if="tileStatus === 'idle'"
        class="tile-status"
      >
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          :disabled="!cohortId || !canWriteSource"
          block
          @click.stop="handleGenerate"
        >
          {{ t('components.analysisExecution.buttons.generate', 'Generate') }}
        </v-btn>
      </div>

      <div
        v-else-if="tileStatus === 'generating'"
        class="tile-status tile-status--generating"
      >
        <v-progress-circular
          indeterminate
          size="20"
          width="2"
          color="primary"
        />
        <span class="ml-2 text-body-2">{{ statusText }}</span>
      </div>

      <div
        v-else-if="tileStatus === 'complete'"
        class="tile-status tile-status--complete"
      >
        <div class="patient-count">
          <span class="patient-count__number">{{ patientCount?.toLocaleString() || '0' }}</span>
          <span class="patient-count__label ml-1">{{ t('columns.personsCount', 'Patients') }}</span>
        </div>
        <v-btn
          color="primary"
          variant="text"
          size="small"
          :disabled="!cohortId || !canWriteSource"
          block
          @click.stop="handleGenerate"
        >
          {{ t('components.analysisExecution.buttons.generate', 'Generate') }}
        </v-btn>
      </div>

      <div
        v-else-if="tileStatus === 'failed'"
        class="tile-status tile-status--failed"
      >
        <v-icon
          color="error"
          size="small"
        >
          mdi-alert-circle
        </v-icon>
        <span class="ml-2 text-error text-caption">{{
          failMessage || t('ir.results.failed', 'Failed').value
        }}</span>
        <v-btn
          color="primary"
          variant="text"
          size="small"
          :disabled="!cohortId || !canWriteSource"
          block
          class="mt-2"
          @click.stop="handleGenerate"
        >
          {{ t('components.analysisExecution.buttons.generate', 'Generate') }}
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useWebAPIStore } from '@/stores/webapi'
import { useSourceAccess } from '@/composables/useEntityAccess'
import type { CDMSource, TileStatus } from '@/models/webapi.types'
import { logger } from '@/utils/logger'

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

// Per-source write access — covers both global admin:source and per-source
// WRITE grants from /user/me's sourceAccess map. Disables Generate when the
// user can't run jobs against this source.
const { canWrite: canWriteSource } = useSourceAccess(toRef(() => props.source.sourceKey))

const job = computed(() => {
  if (!props.cohortId) return undefined
  return webapiStore
    .getJobsByCohortId(props.cohortId)
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

async function handleGenerate() {
  if (!props.cohortId) return

  try {
    await webapiStore.generateCohort(props.cohortId, props.source.sourceKey)
  } catch (error) {
    logger.error('DataSourceTile', 'Generation error', error)
    // Error will be displayed by the store or parent component
  }
}

// Emit tile-click event when card is clicked (for viewing reports)
function handleTileClick() {
  // Only emit if cohort has been generated (complete status)
  if (tileStatus.value === 'complete') {
    emit('tile-click', props.source.sourceKey)
  }
}
</script>

<style scoped>
.data-source-tile {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  transition: all 0.2s ease-in-out;
  height: 100%;
}

.data-source-tile:hover {
  border-color: #1976d2;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.data-source-tile--complete {
  cursor: pointer;
  border-color: #4caf50;
}

.data-source-tile--complete:hover {
  background-color: #f1f8e9;
}

.data-source-tile__content {
  display: flex;
  flex-direction: column;
}

.tile-header {
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 8px;
}

.tile-header__name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f425a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-header__key {
  font-size: 0.75rem;
  color: #666;
}

.tile-status {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-direction: column;
}

.tile-status--generating,
.tile-status--failed {
  flex-direction: row;
  justify-content: center;
}

.tile-status--complete {
  gap: 4px;
}

.patient-count {
  display: flex;
  align-items: baseline;
  justify-content: center;
  padding: 4px 0;
}

.patient-count__number {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f425a;
  line-height: 1;
}

.patient-count__label {
  font-size: 0.75rem;
  color: #666;
}
</style>
