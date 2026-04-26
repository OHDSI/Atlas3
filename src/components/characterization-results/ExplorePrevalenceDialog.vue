<!--
  ExplorePrevalenceDialog

  Drill into the prevalence cell for a single covariate / cohort. Calls
  `explorePrevalence` on open and renders whatever shape the WebAPI
  returns as a generic v-data-table — the columns are inferred from the
  union of keys across rows so this works regardless of the exact
  feature-analysis backing the data.
-->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900"
    scrollable
    @update:model-value="onUpdateModel"
  >
    <v-card data-testid="char-results-explore-dialog">
      <v-card-title class="explore-dialog__title">
        {{ titleText }}
      </v-card-title>

      <v-card-text class="explore-dialog__body">
        <div
          v-if="loading"
          class="explore-dialog__center"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          />
          <span class="ms-3">
            {{ tv('characterizations.results.explore.loading', 'Loading...') }}
          </span>
        </div>

        <v-alert
          v-else-if="error"
          type="error"
          variant="tonal"
          class="mb-2"
        >
          {{ error }}
        </v-alert>

        <div
          v-else-if="!rows.length"
          class="explore-dialog__center"
        >
          {{ tv('characterizations.results.explore.empty', 'No related concepts.') }}
        </div>

        <v-data-table
          v-else
          :items="rows"
          :headers="headers"
          density="compact"
          :items-per-page="25"
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="close"
        >
          {{ tv('characterizations.results.explore.close', 'Close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useI18n } from '@/composables/useI18n'
import { explorePrevalence } from '@/services/characterization.service'
import { logger } from '@/utils/logger'

interface Props {
  modelValue: boolean
  generationId: number | null
  analysisId: number | null
  cohortId: number | null
  covariateId: number | null
  covariateName: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { tv } = useI18n()

const loading = ref(false)
const error = ref<string | null>(null)
const rows = ref<Record<string, unknown>[]>([])

const titleText = computed<string>(() =>
  tv('characterizations.results.explore.title', 'Explore covariate: {name}', {
    name: props.covariateName ?? '',
  })
)

const headers = computed(() => {
  const keys = new Set<string>()
  for (const row of rows.value) {
    for (const k of Object.keys(row)) {
      keys.add(k)
    }
  }
  return Array.from(keys).map((key) => ({
    title: key,
    key,
  }))
})

function isComplete(): boolean {
  return (
    props.generationId !== null &&
    props.analysisId !== null &&
    props.cohortId !== null &&
    props.covariateId !== null
  )
}

async function load(): Promise<void> {
  if (!isComplete()) {
    return
  }
  loading.value = true
  error.value = null
  rows.value = []
  try {
    const result = await explorePrevalence(
      props.generationId as number,
      props.analysisId as number,
      props.cohortId as number,
      props.covariateId as number
    )
    if (Array.isArray(result)) {
      rows.value = result.filter(
        (r): r is Record<string, unknown> => typeof r === 'object' && r !== null
      )
    } else if (result && typeof result === 'object') {
      rows.value = [result as Record<string, unknown>]
    } else {
      rows.value = []
    }
  } catch (err) {
    logger.error('ExplorePrevalenceDialog', 'Failed to explore prevalence', err)
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, props.generationId, props.analysisId, props.cohortId, props.covariateId],
  () => {
    if (props.modelValue && isComplete()) {
      void load()
    }
  },
  { immediate: true }
)

function close(): void {
  emit('update:modelValue', false)
}

function onUpdateModel(value: boolean): void {
  emit('update:modelValue', value)
}
</script>

<style scoped>
.explore-dialog__title {
  font-size: 1.1rem;
  font-weight: 500;
}

.explore-dialog__body {
  min-height: 200px;
}

.explore-dialog__center {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
