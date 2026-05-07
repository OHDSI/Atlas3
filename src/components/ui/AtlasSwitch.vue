<!-- src/components/ui/AtlasSwitch.vue -->
<template>
  <v-switch
    :model-value="modelValue"
    :label="label"
    :disabled="disabled"
    :color="toneColor"
    :error-messages="errorMessages"
    :aria-required="required ? 'true' : undefined"
    :aria-invalid="hasError ? 'true' : undefined"
    density="compact"
    v-bind="forwardAttrs"
    @update:model-value="(v: boolean | null) => $emit('update:modelValue', !!v)"
  />
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

export type AtlasSwitchTone = 'primary' | 'success' | 'danger'

interface Props {
  modelValue?: boolean
  label?: string
  disabled?: boolean
  tone?: AtlasSwitchTone
  error?: string
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  label: undefined,
  disabled: false,
  tone: 'primary',
  error: undefined,
  required: false,
})

defineEmits<{ 'update:modelValue': [value: boolean] }>()
defineOptions({ inheritAttrs: false })

const TONE_COLOR: Record<AtlasSwitchTone, string> = {
  primary: 'primary',
  success: 'success',
  danger:  'error',
}

const toneColor = computed(() => TONE_COLOR[props.tone])

const errorMessages = computed(() => (props.error ? [props.error] : undefined))

const hasError = computed(() => !!props.error)

const attrs = useAttrs()
const forwardAttrs = computed(() => {
  const { density: _d, color: _c, ...rest } = attrs as Record<string, unknown>
  void _d; void _c
  return rest
})
</script>
