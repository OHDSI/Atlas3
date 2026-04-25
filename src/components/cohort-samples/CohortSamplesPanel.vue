<template>
  <div
    class="cohort-samples-panel"
    data-testid="cohort-samples-panel"
  >
    <div class="cohort-samples-panel__header">
      <div>
        <div class="text-subtitle-1 font-weight-medium">
          Samples
        </div>
        <div class="text-caption text-grey-darken-1">
          Random selections of persons drawn from the generated cohort, optionally filtered by age and gender.
        </div>
      </div>
      <v-btn
        color="primary"
        variant="elevated"
        prepend-icon="mdi-plus"
        :disabled="!cohortId || !sourceKey || creating"
        data-testid="cohort-samples-new"
        @click="dialogOpen = true"
      >
        New sample
      </v-btn>
    </div>

    <v-divider class="my-3" />

    <div
      v-if="loading"
      class="py-4"
    >
      <v-skeleton-loader type="table" />
    </div>
    <v-alert
      v-else-if="error"
      type="error"
      variant="tonal"
      data-testid="cohort-samples-error"
    >
      {{ error }}
    </v-alert>
    <template v-else>
      <CohortSamplesList
        :samples="samples"
        :selected-sample-id="selectedSampleId"
        @select="onSelect"
        @refresh="onRefresh"
        @delete="onDelete"
      />
      <div
        v-if="selectedSample"
        class="cohort-samples-panel__detail mt-4"
      >
        <CohortSampleDetail
          :sample="selectedSample"
          :loading="detailLoading"
        />
      </div>
    </template>

    <CohortSampleCreateDialog
      v-model="dialogOpen"
      :submitting="creating"
      @submit="onCreate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  listCohortSamples,
  createCohortSample,
  getCohortSample,
  refreshCohortSample,
  deleteCohortSample,
} from '@/services/webapi'
import type { CohortSample, SampleParameters } from '@/models/cohort-sample.types'
import CohortSamplesList from './CohortSamplesList.vue'
import CohortSampleDetail from './CohortSampleDetail.vue'
import CohortSampleCreateDialog from './CohortSampleCreateDialog.vue'

const props = defineProps<{
  cohortId: number
  sourceKey: string
}>()

const samples = ref<CohortSample[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const creating = ref(false)
const dialogOpen = ref(false)

const selectedSampleId = ref<number | null>(null)
const selectedSample = ref<CohortSample | null>(null)
const detailLoading = ref(false)

async function loadList() {
  if (!props.cohortId || !props.sourceKey) return
  loading.value = true
  error.value = null
  try {
    const list = await listCohortSamples(props.cohortId, props.sourceKey)
    samples.value = list?.samples ?? []
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load samples'
  } finally {
    loading.value = false
  }
}

async function loadDetail(sampleId: number) {
  detailLoading.value = true
  try {
    selectedSample.value = await getCohortSample(props.cohortId, props.sourceKey, sampleId, {
      withElements: true,
    })
  } finally {
    detailLoading.value = false
  }
}

watch(() => [props.cohortId, props.sourceKey] as const, loadList, { immediate: true })

async function onSelect(sample: CohortSample) {
  selectedSampleId.value = sample.id
  await loadDetail(sample.id)
}

async function onCreate(parameters: SampleParameters) {
  creating.value = true
  error.value = null
  try {
    const created = await createCohortSample(props.cohortId, props.sourceKey, parameters)
    if (created) {
      dialogOpen.value = false
      await loadList()
      await onSelect(created)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to create sample'
  } finally {
    creating.value = false
  }
}

async function onRefresh(sample: CohortSample) {
  const refreshed = await refreshCohortSample(props.cohortId, props.sourceKey, sample.id)
  if (refreshed) {
    if (selectedSampleId.value === sample.id) await loadDetail(sample.id)
    await loadList()
  }
}

async function onDelete(sample: CohortSample) {
  const ok = await deleteCohortSample(props.cohortId, props.sourceKey, sample.id)
  if (ok) {
    if (selectedSampleId.value === sample.id) {
      selectedSampleId.value = null
      selectedSample.value = null
    }
    await loadList()
  }
}

defineExpose({ samples, selectedSample, loadList })
</script>

<style scoped>
.cohort-samples-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
</style>
