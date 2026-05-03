<!-- src/components/ui/AtlasTextField.vue -->
<template>
  <component
    :is="rootComponent"
    :model-value="modelValue"
    :label="displayLabel"
    :hint="hint"
    :error-messages="errorMessages"
    :disabled="disabled"
    :readonly="readonly"
    :type="multiline ? undefined : type"
    :placeholder="placeholder"
    :prepend-inner-icon="prependIcon"
    :append-inner-icon="appendIcon"
    :rows="multiline ? rows : undefined"
    density="compact"
    v-bind="forwardAttrs"
    @update:model-value="(v: string | number) => $emit('update:modelValue', v)"
    @blur="$emit('blur', $event)"
    @focus="$emit('focus', $event)"
  />
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { VTextField, VTextarea } from 'vuetify/components'

interface Props {
  modelValue?: string | number
  label?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'url'
  placeholder?: string
  prependIcon?: string
  appendIcon?: string
  multiline?: boolean
  rows?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  label: undefined,
  hint: undefined,
  error: undefined,
  required: false,
  disabled: false,
  readonly: false,
  type: 'text',
  placeholder: undefined,
  prependIcon: undefined,
  appendIcon: undefined,
  multiline: false,
  rows: 3,
})

defineEmits<{
  'update:modelValue': [value: string | number]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

defineOptions({ inheritAttrs: false })

const rootComponent = computed(() => (props.multiline ? VTextarea : VTextField))

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
