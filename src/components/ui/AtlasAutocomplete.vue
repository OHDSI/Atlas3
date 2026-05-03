<!-- src/components/ui/AtlasAutocomplete.vue -->
<template>
  <v-autocomplete
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
    :no-filter="noFilter"
    density="compact"
    v-bind="forwardAttrs"
    @update:model-value="(v: unknown) => $emit('update:modelValue', v)"
    @update:search="(s: string) => $emit('update:search', s)"
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
  noFilter?: boolean
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
  noFilter: false,
})

defineEmits<{
  'update:modelValue': [value: unknown]
  'update:search': [value: string]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

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
