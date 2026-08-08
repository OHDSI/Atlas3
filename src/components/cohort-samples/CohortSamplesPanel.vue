<template>
  <div
    class="cohort-samples-panel"
    data-testid="cohort-samples-panel"
  >
    <div class="cohort-samples-panel__header">
      <div>
        <div class="text-subtitle-1 font-weight-medium">
          {{ t('components.cohortSamples.title', 'Samples').value }}
        </div>
        <div class="text-caption text-grey-darken-1">
          {{
            t(
              'components.cohortSamples.description',
              'Random selections of persons drawn from the generated cohort, optionally filtered by age and gender.'
            ).value
          }}
        </div>
      </div>
      <AtlasButton
        variant="primary"
        icon="mdi-plus"
        :disabled="!cohortId || !sourceKey || creating"
        data-testid="cohort-samples-new"
        @click="dialogOpen = true"
      >
        {{ t('components.cohortSamples.newSample', 'New sample').value }}
      </AtlasButton>
    </div>

    <AtlasDivider class="my-3" />

    <div
      v-if="loading"
      class="py-4"
    >
      <AtlasSkeleton type="table" />
    </div>
    <AtlasAlert
      v-else-if="error"
      severity="danger"
      data-testid="cohort-samples-error"
    >
      {{ error }}
    </AtlasAlert>
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
          :source-key="sourceKey"
          @open-profile="(personId: string) => $emit('open-profile', personId)"
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
import { AtlasAlert, AtlasButton, AtlasDivider, AtlasSkeleton } from '@/components/ui'
import { ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import {
  listCohortSamples,
  createCohortSample,
  getCohortSample,
  refreshCohortSample,
  deleteCohortSample,
} from '@/services/cohort-sample.service'
import { logger } from '@/utils/logger'
import type { CohortSample, SampleParameters } from '@/models/cohort-sample.types'
import CohortSamplesList from './CohortSamplesList.vue'
import CohortSampleDetail from './CohortSampleDetail.vue'
import CohortSampleCreateDialog from './CohortSampleCreateDialog.vue'

const { t, tv } = useI18n()

const props = defineProps<{
  cohortId: number
  sourceKey: string
}>()

defineEmits<{ 'open-profile': [personId: string] }>()

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
  const result = await listCohortSamples(props.cohortId, props.sourceKey)
  if (result.success) {
    samples.value = result.data.samples
  } else {
    // A failed list fetch is not "no samples" — show the error rather than
    // an empty state, or a 403/network failure looks identical to a cohort
    // that simply has no samples yet.
    samples.value = []
    error.value =
      result.error.message ||
      tv('components.cohortSamples.failedToLoadSamples', 'Failed to load samples')
  }
  loading.value = false
}

async function loadDetail(sampleId: number) {
  detailLoading.value = true
  try {
    const result = await getCohortSample(props.cohortId, props.sourceKey, sampleId, {
      withElements: true,
    })
    if (result.success) {
      selectedSample.value = result.data
    } else {
      selectedSample.value = null
      logger.error('CohortSamplesPanel', 'Failed to load sample detail', result.error)
    }
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
  const result = await createCohortSample(props.cohortId, props.sourceKey, parameters)
  if (result.success) {
    dialogOpen.value = false
    await loadList()
    await onSelect(result.data)
  } else {
    // Previously a malformed response was swallowed silently while a
    // transport error surfaced — both are a failed create now.
    error.value =
      result.error.message ||
      tv('components.cohortSamples.failedToCreateSample', 'Failed to create sample')
  }
  creating.value = false
}

async function onRefresh(sample: CohortSample) {
  const result = await refreshCohortSample(props.cohortId, props.sourceKey, sample.id)
  if (result.success) {
    if (selectedSampleId.value === sample.id) await loadDetail(sample.id)
    await loadList()
  } else {
    logger.error('CohortSamplesPanel', 'Failed to refresh sample', result.error)
  }
}

async function onDelete(sample: CohortSample) {
  const result = await deleteCohortSample(props.cohortId, props.sourceKey, sample.id)
  if (result.success) {
    if (selectedSampleId.value === sample.id) {
      selectedSampleId.value = null
      selectedSample.value = null
    }
    await loadList()
  } else {
    logger.error('CohortSamplesPanel', 'Failed to delete sample', result.error)
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
