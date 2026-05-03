<!--
  ExplorePrevalenceDialog

  Drill into the prevalence cell for a single covariate / cohort. Calls
  `explorePrevalence` on open and renders whatever shape the WebAPI
  returns as a generic v-data-table — the columns are inferred from the
  union of keys across rows so this works regardless of the exact
  feature-analysis backing the data.
-->
<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="EXPLORE"
    :title="titleText"
    max-width="900"
    data-testid="char-results-explore-dialog"
    @close="close"
    @update:model-value="onUpdateModel"
  >
    <div
      v-if="loading"
      class="explore-dialog__loading"
    >
      <AtlasSkeleton
        v-for="n in 4"
        :key="n"
        type="table-row"
      />
    </div>

    <AtlasAlert
      v-else-if="error"
      severity="danger"
      class="mb-2"
    >
      {{ error }}
    </AtlasAlert>

    <div
      v-else-if="!rows.length"
      class="explore-dialog__empty"
    >
      <AtlasIcon
        icon="mdi-database-off-outline"
        size="32"
        class="explore-dialog__empty-icon"
      />
      <p class="explore-dialog__empty-text">
        {{ tv('common.noData', 'No related concepts.') }}
      </p>
    </div>

    <AtlasDataTable
      v-else
      :items="rows"
      :headers="headers"
      :items-per-page="25"
    />
    <template #actions>
      <AtlasButton
        variant="ghost"
        @click="close"
      >
        {{ tv('common.close', 'Close') }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasDataTable, AtlasDialog, AtlasIcon, AtlasSkeleton } from '@/components/ui'
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
  tv(
    'cc.viewEdit.executions.prevalenceStatConverter.exploringConceptHierarchyFor',
    'Explore covariate: {name}',
    {
      name: props.covariateName ?? '',
    }
  )
)

const headers = computed(() => {
  const keys = new Set<string>()
  for (const row of rows.value) {
    for (const k of Object.keys(row)) {
      keys.add(k)
    }
  }
  return Array.from(keys).map(key => ({
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
.explore-dialog__loading {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.explore-dialog__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface-variant));
}

.explore-dialog__empty-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
}

.explore-dialog__empty-text {
  margin: 0;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
