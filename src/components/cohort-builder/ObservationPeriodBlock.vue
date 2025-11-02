<template>
  <v-card variant="outlined">
    <v-card-title class="text-subtitle-1">Observation Period</v-card-title>
    <v-card-text>
      <v-text-field
        :model-value="modelValue?.priorDays || 0"
        type="number"
        label="Prior Days"
        hint="Days of continuous observation before entry"
        data-testid="prior-days-input"
        @update:model-value="updatePrior"
      />
      <v-text-field
        :model-value="modelValue?.postDays || 0"
        type="number"
        label="Post Days"
        hint="Days of continuous observation after entry"
        data-testid="post-days-input"
        @update:model-value="updatePost"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { ObservationPeriod } from '@/models/cohort.types'

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
