<!--
  ExecutionsPanel

  Lives inside the Characterization Builder Executions tab. Shows all
  generations for the current characterization, lets the user start a
  new run, and polls active executions until they reach a terminal
  state (COMPLETED / FAILED / CANCELED).
-->
<template>
  <div
    class="executions-panel"
    data-testid="executions-panel"
  >
    <div class="executions-panel__header">
      <h2 class="executions-panel__title">
        {{ t('cc.viewEdit.executions.title', 'Executions') }}
      </h2>
      <v-tooltip
        location="top"
        :text="runDisabledReason"
        :disabled="!runDisabledReason"
      >
        <template #activator="{ props: tooltipProps }">
          <div v-bind="tooltipProps">
            <v-btn
              color="primary"
              variant="elevated"
              prepend-icon="mdi-play"
              :disabled="!canRun"
              data-testid="executions-panel-run"
              @click="openDialog"
            >
              {{ t('cohortDefinitions.cohort.modals.configureReportsToRun.run', 'Run') }}
            </v-btn>
          </div>
        </template>
      </v-tooltip>
    </div>

    <v-alert
      v-if="store.executionsError"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      data-testid="executions-panel-error"
    >
      {{ store.executionsError }}
    </v-alert>

    <div
      v-if="store.executionsLoading && store.executions.length === 0"
      class="executions-panel__loading"
      data-testid="executions-panel-loading"
    >
      <v-progress-circular
        indeterminate
        size="32"
      />
    </div>

    <div
      v-else-if="store.executions.length === 0"
      class="executions-panel__empty"
      data-testid="executions-panel-empty"
    >
      {{ t('common.noData', 'No executions yet.') }}
    </div>

    <div
      v-else
      class="executions-panel__list"
      data-testid="executions-panel-list"
    >
      <ExecutionRow
        v-for="execution in store.executions"
        :key="execution.id"
        :execution="execution"
        :characterization-id="characterizationId ?? 0"
        @cancel="onCancel(execution)"
        @view-results="onViewResults"
      />
    </div>

    <RunExecutionDialog
      v-model="dialogOpen"
      :characterization-id="characterizationId"
      @started="onStarted"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useI18n } from '@/composables/useI18n'
import { useCharacterizationStore } from '@/stores/characterization'
import { isTerminalStatus } from '@/composables/useExecutionPolling'
import { logger } from '@/utils/logger'
import ExecutionRow from './ExecutionRow.vue'
import RunExecutionDialog from './RunExecutionDialog.vue'
import type { CharacterizationExecution } from '@/models/characterization.types'

interface Props {
  characterizationId: number | null
}

const props = defineProps<Props>()

const { t, tv } = useI18n()
const router = useRouter()
const store = useCharacterizationStore()

const dialogOpen = ref<boolean>(false)

const runDisabledReason = computed<string>(() => {
  if (props.characterizationId == null) {
    return tv(
      'characterizations.editor.executions.runDisabledNoId',
      'Save the characterization before running.'
    )
  }
  if (store.isDirty) {
    return tv(
      'const.disabledReason.dirty',
      'Save your changes before running.'
    )
  }
  return ''
})

const canRun = computed<boolean>(
  () => props.characterizationId != null && !store.isDirty
)

function openDialog() {
  if (!canRun.value) return
  dialogOpen.value = true
}

async function loadAndPollActive() {
  if (props.characterizationId == null) return
  await store.loadExecutions(props.characterizationId)
  // Re-attach polling for any executions that haven't reached a terminal state.
  for (const exec of store.executions) {
    if (!isTerminalStatus(exec.status)) {
      store.pollExecution(exec.id, () => {
        if (props.characterizationId != null) {
          void store.loadExecutions(props.characterizationId)
        }
      })
    }
  }
}

function onStarted(execution: CharacterizationExecution) {
  // Begin polling immediately; refresh the list once it reaches terminal.
  store.pollExecution(execution.id, () => {
    if (props.characterizationId != null) {
      void store.loadExecutions(props.characterizationId)
    }
  })
}

async function onCancel(execution: CharacterizationExecution) {
  if (props.characterizationId == null) return
  const confirmText = tv(
    'components.analysisExecution.stopGenerationConfirmation',
    `Cancel execution on '${execution.sourceKey}'?`,
    { source: execution.sourceKey }
  )
  if (!window.confirm(confirmText)) return

  try {
    await store.cancelExecution(
      props.characterizationId,
      execution.sourceKey,
      execution.id
    )
  } catch (err) {
    logger.error('ExecutionsPanel', 'Cancel failed', err)
  }
}

function onViewResults(generationId: number) {
  if (props.characterizationId == null) return
  router.push(
    `/characterizations/${props.characterizationId}/results/${generationId}`
  )
}

watch(
  () => props.characterizationId,
  (id) => {
    if (id != null) {
      void loadAndPollActive()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  // Don't dispose the whole store — other panels may still rely on
  // executions in memory. Stop polling for executions we kicked off.
  for (const exec of store.executions) {
    store.stopPolling(exec.id)
  }
})
</script>

<style scoped>
.executions-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.executions-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.executions-panel__title {
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0;
}

.executions-panel__loading {
  display: flex;
  justify-content: center;
  padding: 32px;
}

.executions-panel__empty {
  padding: 32px;
  text-align: center;
  color: rgba(0, 0, 0, 0.6);
  font-style: italic;
}

.executions-panel__list {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  overflow: hidden;
}
</style>
