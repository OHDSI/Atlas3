<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { Cardinality } from '@/models/event.types'
import { useCardinality } from '@/composables/useCardinality'

const props = defineProps<{
  modelValue?: Cardinality
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Cardinality]
}>()

const { t, tv } = useI18n()
const {
  validateCardinality,
  defaultCardinality,
  getCardinalityTypeOptions,
  getCountingMethodOptions,
} = useCardinality()

// Local state with default values
const cardinality = computed({
  get: () => props.modelValue ?? defaultCardinality(),
  set: (value: Cardinality) => emit('update:modelValue', value),
})

// Local ref for count with immediate updates
const countModel = ref(cardinality.value.count)
const isUserEditing = ref(false)

// Sync countModel when prop changes from parent (but not during user editing)
watch(() => props.modelValue?.count, (newCount) => {
  if (newCount !== undefined && !isUserEditing.value) {
    countModel.value = newCount
  }
}, { immediate: true })

// Computed for count with local state and emit
const count = computed({
  get: () => countModel.value,
  set: (value: number) => {
    isUserEditing.value = true
    countModel.value = value
    const current = props.modelValue ?? defaultCardinality()
    emit('update:modelValue', {
      ...current,
      count: value,
    })
    // Reset editing flag after a short delay to allow prop updates
    setTimeout(() => {
      isUserEditing.value = false
    }, 100)
  },
})

// Validation
const validation = computed(() => validateCardinality(cardinality.value))

// Dropdown options
const typeOptions = getCardinalityTypeOptions()
const countingMethodOptions = getCountingMethodOptions()

// Update handlers - CRITICAL: Use ?? operator for zero-count preservation
const updateType = (type: Cardinality['type']) => {
  const current = props.modelValue ?? defaultCardinality()
  cardinality.value = {
    ...current,
    type,
    // Preserve zero count using ?? operator (NOT || which converts 0 to 1)
    count: current.count ?? 1,
  }
}

const updateCountingMethod = (countingMethod: Cardinality['countingMethod']) => {
  const current = props.modelValue ?? defaultCardinality()
  cardinality.value = {
    ...current,
    countingMethod,
  }
}

// Count validation rules (currently unused - validation done in composable)
// const countRules = computed(() => {
//   const rules: Array<(v: number) => boolean | string> = []
//   // Must be non-negative
//   rules.push((v: number) => v >= 0 || 'Count must be >= 0')
//   // AT_LEAST requires count >= 1
//   if (cardinality.value.type === 'AT_LEAST') {
//     rules.push((v: number) => v >= 1 || 'AT_LEAST requires count >= 1')
//   }
//   return rules
// })

// NOTE: Initialization is now handled by parent component (EventCard.addCardinality)
// This prevents race condition between watcher initialization and immediate user input
</script>

<template>
  <v-card
    class="cardinality-editor"
    elevation="0"
    variant="outlined"
  >
    <v-card-title class="text-subtitle-1">
      {{ t('components.cardinalityInput.title') }}
    </v-card-title>
    <v-card-text>
      <v-row dense>
        <!-- Cardinality Type Dropdown -->
        <v-col
          cols="12"
          md="4"
        >
          <v-select
            :model-value="cardinality.type"
            :items="typeOptions"
            item-title="label"
            item-value="value"
            :label="tv('components.cardinalityInput.type')"
            aria-label="Cardinality Type"
            density="compact"
            variant="outlined"
            hide-details="auto"
            @update:model-value="updateType"
          />
        </v-col>

        <!-- Count Input - Using native input for Playwright compatibility -->
        <v-col
          cols="12"
          md="4"
        >
          <label
            class="v-label"
            for="count-input"
          >{{ t('components.cardinalityInput.count') }}</label>
          <input
            id="count-input"
            :value="count"
            type="number"
            aria-label="Count"
            min="0"
            data-testid="count-input"
            class="v-input__control"
            style="width: 100%; padding: 8px; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 4px;"
            @input="(e) => count = Number((e.target as HTMLInputElement).value)"
          >
        </v-col>

        <!-- Counting Method Dropdown -->
        <v-col
          cols="12"
          md="4"
        >
          <v-select
            :model-value="cardinality.countingMethod"
            :items="countingMethodOptions"
            item-title="label"
            item-value="value"
            :label="tv('components.cardinalityInput.countingMethod')"
            aria-label="Counting Method"
            density="compact"
            variant="outlined"
            hide-details="auto"
            @update:model-value="updateCountingMethod"
          />
        </v-col>
      </v-row>

      <!-- Validation Error Messages -->
      <v-row
        v-if="!validation.isValid"
        dense
      >
        <v-col cols="12">
          <v-alert
            type="error"
            variant="tonal"
            density="compact"
            class="mt-2"
          >
            <ul class="pl-4">
              <li
                v-for="error in validation.errors"
                :key="error"
              >
                {{ error }}
              </li>
            </ul>
          </v-alert>
        </v-col>
      </v-row>

      <!-- Help Text -->
      <v-row dense>
        <v-col cols="12">
          <div class="text-caption text-medium-emphasis mt-2">
            <template v-if="cardinality.type === 'AT_LEAST'">
              {{ t('components.cardinalityInput.help.atLeast', { count }) }}
            </template>
            <template v-else-if="cardinality.type === 'EXACTLY'">
              {{ t('components.cardinalityInput.help.exactly', { count }) }}
              <span
                v-if="count === 0"
                class="text-warning"
              >
                {{ t('components.cardinalityInput.help.exclusion') }}
              </span>
            </template>
            <template v-else-if="cardinality.type === 'AT_MOST'">
              {{ t('components.cardinalityInput.help.atMost', { count }) }}
            </template>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.cardinality-editor {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
