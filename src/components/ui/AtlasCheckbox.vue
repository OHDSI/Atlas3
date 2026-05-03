<!-- src/components/ui/AtlasCheckbox.vue -->
<template>
  <v-checkbox
    :model-value="modelValue"
    :label="label"
    :disabled="disabled"
    :error-messages="errorMessages"
    :indeterminate="indeterminate"
    density="compact"
    v-bind="forwardAttrs"
    @update:model-value="(v: boolean | null) => $emit('update:modelValue', !!v)"
  />
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

interface Props {
  modelValue?: boolean
  label?: string
  disabled?: boolean
  error?: string
  indeterminate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  label: undefined,
  disabled: false,
  error: undefined,
  indeterminate: false,
})

defineEmits<{ 'update:modelValue': [value: boolean] }>()
defineOptions({ inheritAttrs: false })

const errorMessages = computed(() => (props.error ? [props.error] : undefined))

const attrs = useAttrs()
const forwardAttrs = computed(() => {
  const { density: _d, ...rest } = attrs as Record<string, unknown>
  void _d
  return rest
})
</script>
