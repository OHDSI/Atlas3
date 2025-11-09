<template>
  <v-card variant="outlined">
    <v-card-title class="text-subtitle-1">{{ t('common.observationPeriod', 'Observation Period') }}</v-card-title>
    <v-card-text>
      <v-text-field
        :model-value="modelValue?.priorDays || 0"
        type="number"
        :label="t('common.priorDays', 'Prior Days').value"
        :hint="t('common.priorDaysHint', 'Days of continuous observation before entry').value"
        data-testid="prior-days-input"
        @update:model-value="updatePrior"
      />
      <v-text-field
        :model-value="modelValue?.postDays || 0"
        type="number"
        :label="t('common.postDays', 'Post Days').value"
        :hint="t('common.postDaysHint', 'Days of continuous observation after entry').value"
        data-testid="post-days-input"
        @update:model-value="updatePost"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { ObservationPeriod } from '@/models/cohort.types'

const { t } = useI18n()

interface Props {
  modelValue?: ObservationPeriod
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: ObservationPeriod]
}>()

function updatePrior(value: string) {
  emit('update:modelValue', { priorDays: parseInt(value), postDays: props.modelValue?.postDays || 0 })
}

function updatePost(value: string) {
  emit('update:modelValue', { priorDays: props.modelValue?.priorDays || 0, postDays: parseInt(value) })
}
</script>
