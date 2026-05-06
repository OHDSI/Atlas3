<script setup lang="ts">
import { AtlasAlert, AtlasCol, AtlasRow, AtlasSelect } from '@/components/ui'
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
watch(
  () => props.modelValue?.count,
  newCount => {
    if (newCount !== undefined && !isUserEditing.value) {
      countModel.value = newCount
    }
  },
  { immediate: true }
)

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

// Initialization is handled by parent component to prevent race conditions
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
      <AtlasRow dense>
        <!-- Cardinality Type Dropdown -->
        <AtlasCol
          cols="12"
          md="4"
        >
          <AtlasSelect
            :model-value="cardinality.type"
            :items="typeOptions"
            item-title="label"
            item-value="value"
            :label="tv('columns.type')"
            aria-label="Cardinality Type"
            variant="outlined"
            hide-details="auto"
            @update:model-value="(v) => updateType(v as Cardinality['type'])"
          />
        </AtlasCol>

        <!-- Count Input - Using native input for Playwright compatibility -->
        <AtlasCol
          cols="12"
          md="4"
        >
          <label
            class="v-label"
            for="count-input"
          >
            {{ t('columns.count') }}
            <input
              id="count-input"
              :value="count"
              type="number"
              aria-label="Count"
              min="0"
              data-testid="count-input"
              class="v-input__control"
              style="
                width: 100%;
                padding: 8px;
                border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
                border-radius: 4px;
              "
              @input="e => (count = Number((e.target as HTMLInputElement).value))"
            >
          </label>
        </AtlasCol>

        <!-- Counting Method Dropdown -->
        <AtlasCol
          cols="12"
          md="4"
        >
          <AtlasSelect
            :model-value="cardinality.countingMethod"
            :items="countingMethodOptions"
            item-title="label"
            item-value="value"
            :label="tv('components.cardinalityInput.countingMethod')"
            aria-label="Counting Method"
            variant="outlined"
            hide-details="auto"
            @update:model-value="(v) => updateCountingMethod(v as Cardinality['countingMethod'])"
          />
        </AtlasCol>
      </AtlasRow>

      <!-- Validation Error Messages -->
      <AtlasRow
        v-if="!validation.isValid"
        dense
      >
        <AtlasCol cols="12">
          <AtlasAlert
            severity="danger"
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
          </AtlasAlert>
        </AtlasCol>
      </AtlasRow>

      <!-- Help Text -->
      <AtlasRow dense>
        <AtlasCol cols="12">
          <div class="text-caption text-medium-emphasis mt-2">
            <template v-if="cardinality.type === 'AT_LEAST'">
              {{ t('options.atLeast', { count }) }}
            </template>
            <template v-else-if="cardinality.type === 'EXACTLY'">
              {{ t('options.exactly', { count }) }}
              <span
                v-if="count === 0"
                class="text-warning"
              >
                {{ t('options.excluded') }}
              </span>
            </template>
            <template v-else-if="cardinality.type === 'AT_MOST'">
              {{ t('options.atMost', { count }) }}
            </template>
          </div>
        </AtlasCol>
      </AtlasRow>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.cardinality-editor {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
