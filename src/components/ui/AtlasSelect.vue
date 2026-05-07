<!-- src/components/ui/AtlasSelect.vue -->
<template>
  <v-select
    :model-value="modelValue"
    :items="items"
    :label="displayLabel"
    :hint="hint"
    :error-messages="errorMessages"
    :disabled="disabled"
    :item-title="itemTitle"
    :item-value="itemValue"
    :multiple="multiple"
    :clearable="clearable"
    :placeholder="placeholder"
    :aria-required="required ? 'true' : undefined"
    :aria-invalid="hasError ? 'true' : undefined"
    density="compact"
    v-bind="forwardAttrs"
    @update:model-value="(v: unknown) => $emit('update:modelValue', v)"
    @blur="$emit('blur', $event)"
    @focus="$emit('focus', $event)"
  />
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

interface Props {
  modelValue?: unknown
  items: unknown[]
  label?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  itemTitle?: string
  itemValue?: string
  multiple?: boolean
  clearable?: boolean
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  label: undefined,
  hint: undefined,
  error: undefined,
  required: false,
  disabled: false,
  itemTitle: 'title',
  itemValue: 'value',
  multiple: false,
  clearable: false,
  placeholder: undefined,
})

defineEmits<{
  'update:modelValue': [value: unknown]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

defineOptions({ inheritAttrs: false })

const displayLabel = computed(() => {
  if (!props.label) return undefined
  return props.required ? `${props.label} *` : props.label
})

const errorMessages = computed(() => (props.error ? [props.error] : undefined))

const hasError = computed(() => !!props.error)

const attrs = useAttrs()
const forwardAttrs = computed(() => {
  const { density: _d, ...rest } = attrs as Record<string, unknown>
  void _d
  return rest
})
</script>
