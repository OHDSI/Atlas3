<!--
  RunExecutionDialog

  Modal that picks a CDM source and triggers a characterization generation
  via the characterization store. Emits the new execution back to the
  caller so it can kick off polling.
-->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    persistent
    data-testid="run-execution-dialog"
    @update:model-value="onModelUpdate"
  >
    <v-card>
      <v-card-title>
        {{ t('characterizations.editor.executions.dialog.title', 'Run characterization') }}
      </v-card-title>
      <v-card-text>
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          class="mb-4"
          data-testid="run-execution-dialog-error"
        >
          {{ errorMessage }}
        </v-alert>
        <v-select
          v-model="selectedSourceKey"
          :items="sourceItems"
          item-title="title"
          item-value="value"
          :label="t('characterizations.editor.executions.dialog.sourceLabel', 'Data source').value"
          :loading="loadingSources"
          :disabled="loadingSources"
          :error-messages="sourceError"
          variant="outlined"
          density="comfortable"
          data-testid="run-execution-dialog-source"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="running"
          data-testid="run-execution-dialog-cancel"
          @click="close"
        >
          {{ t('characterizations.editor.executions.dialog.cancel', 'Cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="running"
          :disabled="!canRun"
          data-testid="run-execution-dialog-run"
          @click="onRun"
        >
          {{ t('characterizations.editor.executions.dialog.run', 'Run') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useI18n } from '@/composables/useI18n'
import { useCharacterizationStore } from '@/stores/characterization'
import { fetchCDMSources } from '@/services/webapi'
import { logger } from '@/utils/logger'
import type { CDMSource } from '@/models/webapi.types'
import type { CharacterizationExecution } from '@/models/characterization.types'

interface Props {
  modelValue: boolean
  characterizationId: number | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  started: [execution: CharacterizationExecution]
}>()

const { t, tv } = useI18n()
const store = useCharacterizationStore()

const sources = ref<CDMSource[]>([])
const loadingSources = ref<boolean>(false)
const selectedSourceKey = ref<string | null>(null)
const running = ref<boolean>(false)
const sourceError = ref<string>('')
const errorMessage = ref<string>('')

const sourceItems = computed(() =>
  sources.value.map((s) => ({
    title: s.sourceName ?? s.sourceKey,
    value: s.sourceKey,
  }))
)

const canRun = computed<boolean>(
  () =>
    !running.value &&
    !loadingSources.value &&
    props.characterizationId != null &&
    !!selectedSourceKey.value
)

async function loadSources() {
  loadingSources.value = true
  errorMessage.value = ''
  try {
    const result = await fetchCDMSources()
    if (result.success) {
      sources.value = result.data
    } else {
      sources.value = []
      errorMessage.value = result.error
      logger.error('RunExecutionDialog', 'Failed to load CDM sources', result.error)
    }
  } catch (err) {
    sources.value = []
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load data sources'
    logger.error('RunExecutionDialog', 'Unexpected error loading sources', err)
  } finally {
    loadingSources.value = false
  }
}

function close() {
  emit('update:modelValue', false)
}

function onModelUpdate(value: boolean | null) {
  emit('update:modelValue', Boolean(value))
}

async function onRun() {
  sourceError.value = ''
  if (props.characterizationId == null) {
    return
  }
  if (!selectedSourceKey.value) {
    sourceError.value = tv(
      'characterizations.editor.executions.dialog.sourceRequired',
      'Select a data source'
    )
    return
  }

  running.value = true
  try {
    const execution = await store.runExecution(
      props.characterizationId,
      selectedSourceKey.value
    )
    emit('started', execution)
    close()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to start generation'
    logger.error('RunExecutionDialog', 'Run failed', err)
  } finally {
    running.value = false
  }
}

// Reset and load when the dialog opens.
watch(
  () => props.modelValue,
  (open, wasOpen) => {
    if (open && !wasOpen) {
      selectedSourceKey.value = null
      sourceError.value = ''
      errorMessage.value = ''
      void loadSources()
    }
  },
  { immediate: true }
)
</script>
