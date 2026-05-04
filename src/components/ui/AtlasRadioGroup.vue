<!-- src/components/ui/AtlasRadioGroup.vue -->
<template>
  <v-radio-group
    :model-value="modelValue"
    :label="displayLabel"
    :inline="inline"
    :error-messages="errorMessages"
    :disabled="disabled"
    density="compact"
    v-bind="forwardAttrs"
    @update:model-value="(v: string | number | null) => $emit('update:modelValue', v)"
  >
    <slot />
  </v-radio-group>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

interface Props {
  modelValue?: string | number
  label?: string
  inline?: boolean
  error?: string
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  label: undefined,
  inline: false,
  error: undefined,
  disabled: false,
  required: false,
})

defineEmits<{ 'update:modelValue': [value: string | number | null] }>()
defineOptions({ inheritAttrs: false })

const displayLabel = computed(() => {
  if (!props.label) return undefined
  return props.required ? `${props.label} *` : props.label
})

const errorMessages = computed(() => (props.error ? [props.error] : undefined))

const attrs = useAttrs()
const forwardAttrs = computed(() => {
  const { density: _d, ...rest } = attrs as Record<string, unknown>
  void _d
  return rest
})
</script>
