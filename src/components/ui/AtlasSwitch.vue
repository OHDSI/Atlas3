<!-- src/components/ui/AtlasSwitch.vue -->
<template>
  <v-switch
    :model-value="modelValue"
    :label="label"
    :disabled="disabled"
    :color="toneColor"
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
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  label: undefined,
  disabled: false,
  tone: 'primary',
})

defineEmits<{ 'update:modelValue': [value: boolean] }>()
defineOptions({ inheritAttrs: false })

const TONE_COLOR: Record<AtlasSwitchTone, string> = {
  primary: 'primary',
  success: 'success',
  danger:  'error',
}

const toneColor = computed(() => TONE_COLOR[props.tone])

const attrs = useAttrs()
const forwardAttrs = computed(() => {
  const { density: _d, color: _c, ...rest } = attrs as Record<string, unknown>
  void _d; void _c
  return rest
})
</script>
