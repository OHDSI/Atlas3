<template>
  <v-dialog
    :model-value="modelValue"
    max-width="560"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-shuffle-variant</v-icon>
        New cohort sample
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="form.name"
          label="Sample name"
          variant="outlined"
          density="compact"
          autofocus
          data-testid="sample-name"
          required
        />
        <v-text-field
          v-model.number="form.size"
          type="number"
          label="Number of persons"
          :min="1"
          :max="SAMPLE_SIZE_MAX"
          :hint="`Maximum ${SAMPLE_SIZE_MAX}`"
          persistent-hint
          variant="outlined"
          density="compact"
          data-testid="sample-size"
        />

        <div class="text-subtitle-2 mt-4 mb-1">Gender (optional)</div>
        <div class="d-flex flex-wrap ga-3">
          <v-checkbox
            v-model="genderMale"
            label="Male"
            density="compact"
            hide-details
            data-testid="sample-gender-male"
          />
          <v-checkbox
            v-model="genderFemale"
            label="Female"
            density="compact"
            hide-details
            data-testid="sample-gender-female"
          />
          <v-checkbox
            v-model="genderOther"
            label="Other / non-binary"
            density="compact"
            hide-details
            data-testid="sample-gender-other"
          />
        </div>

        <div class="text-subtitle-2 mt-4 mb-1">Age (optional)</div>
        <div class="d-flex ga-2 align-start">
          <v-select
            v-model="ageMode"
            :items="ageModeOptions"
            item-title="label"
            item-value="value"
            label="Comparator"
            variant="outlined"
            density="compact"
            clearable
            data-testid="sample-age-mode"
            style="min-width: 180px"
          />
          <template v-if="ageMode && !isRangeMode">
            <v-text-field
              v-model.number="ageValue"
              type="number"
              :min="0"
              :max="SAMPLE_AGE_MAX - 1"
              label="Age"
              variant="outlined"
              density="compact"
              data-testid="sample-age-value"
              style="max-width: 120px"
            />
          </template>
          <template v-else-if="isRangeMode">
            <v-text-field
              v-model.number="ageMin"
              type="number"
              :min="0"
              :max="SAMPLE_AGE_MAX - 1"
              label="Min age"
              variant="outlined"
              density="compact"
              data-testid="sample-age-min"
              style="max-width: 120px"
            />
            <v-text-field
              v-model.number="ageMax"
              type="number"
              :min="0"
              :max="SAMPLE_AGE_MAX - 1"
              label="Max age"
              variant="outlined"
              density="compact"
              data-testid="sample-age-max"
              style="max-width: 120px"
            />
          </template>
        </div>

        <v-alert
          v-if="errors.length > 0"
          type="error"
          variant="tonal"
          density="compact"
          class="mt-3"
          data-testid="sample-form-errors"
        >
          <ul class="ma-0 pa-0" style="list-style: none">
            <li v-for="(err, i) in errors" :key="i">{{ err }}</li>
          </ul>
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="cancel"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="errors.length > 0 || submitting"
          :loading="submitting"
          data-testid="sample-submit"
          @click="submit"
        >
          Create sample
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  GENDER_FEMALE_CONCEPT_ID,
  GENDER_MALE_CONCEPT_ID,
  SAMPLE_AGE_MAX,
  SAMPLE_SIZE_MAX,
  SampleAgeModeValues,
  type SampleAge,
  type SampleAgeMode,
  type SampleGender,
  type SampleParameters,
  validateSampleParameters,
} from '@/models/cohort-sample.types'

const props = defineProps<{
  modelValue: boolean
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  submit: [parameters: SampleParameters]
}>()

const form = reactive({ name: '', size: 100 })
const genderMale = ref(true)
const genderFemale = ref(true)
const genderOther = ref(false)

const ageMode = ref<SampleAgeMode | null>(null)
const ageValue = ref<number | null>(null)
const ageMin = ref<number | null>(null)
const ageMax = ref<number | null>(null)

const ageModeOptions: Array<{ value: SampleAgeMode; label: string }> = [
  { value: 'lessThan', label: '< less than' },
  { value: 'lessThanOrEqual', label: '≤ at most' },
  { value: 'equalTo', label: '= equal to' },
  { value: 'greaterThanOrEqual', label: '≥ at least' },
  { value: 'greaterThan', label: '> greater than' },
  { value: 'between', label: 'between' },
  { value: 'notBetween', label: 'not between' },
]

const isRangeMode = computed(() => ageMode.value === 'between' || ageMode.value === 'notBetween')

// Reset form whenever the dialog is opened so a stale state doesn't leak between launches.
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.name = ''
      form.size = 100
      genderMale.value = true
      genderFemale.value = true
      genderOther.value = false
      ageMode.value = null
      ageValue.value = null
      ageMin.value = null
      ageMax.value = null
    }
  }
)

const buildGender = (): SampleGender | undefined => {
  const conceptIds: number[] = []
  if (genderMale.value) conceptIds.push(GENDER_MALE_CONCEPT_ID)
  if (genderFemale.value) conceptIds.push(GENDER_FEMALE_CONCEPT_ID)
  // No constraint at all? Skip the gender filter entirely.
  if (conceptIds.length === 0 && !genderOther.value) return undefined
  // All selected? Same — no filter needed.
  if (genderMale.value && genderFemale.value && genderOther.value) return undefined
  return { conceptIds, otherNonBinary: genderOther.value }
}

const buildAge = (): SampleAge | undefined => {
  if (!ageMode.value) return undefined
  if (isRangeMode.value) {
    if (ageMin.value === null || ageMax.value === null) return { mode: ageMode.value }
    return { mode: ageMode.value, min: ageMin.value, max: ageMax.value }
  }
  if (ageValue.value === null) return { mode: ageMode.value }
  return { mode: ageMode.value, value: ageValue.value }
}

const buildParameters = (): SampleParameters => ({
  name: form.name.trim(),
  size: form.size,
  age: buildAge(),
  gender: buildGender(),
})

const errors = computed(() => {
  // Don't surface validation noise on the very first render before the user
  // touches the form — but `name === ''` already triggers an error which is
  // fine, and the submit button stays disabled.
  return validateSampleParameters(buildParameters())
})

function submit() {
  if (errors.value.length > 0) return
  emit('submit', buildParameters())
}

function cancel() {
  emit('update:modelValue', false)
}

// Re-export for templates / tests
const _SAMPLE_SIZE_MAX = SAMPLE_SIZE_MAX
const _SAMPLE_AGE_MAX = SAMPLE_AGE_MAX
defineExpose({ SAMPLE_SIZE_MAX: _SAMPLE_SIZE_MAX, SAMPLE_AGE_MAX: _SAMPLE_AGE_MAX, SampleAgeModeValues })
</script>
