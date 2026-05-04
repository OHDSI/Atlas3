<!-- src/components/ui/AtlasSnackbar.vue -->
<template>
  <v-snackbar
    :model-value="modelValue"
    :color="severityColor"
    :timeout="timeout"
    :location="location"
    v-bind="forwardAttrs"
    @update:model-value="(v: boolean) => $emit('update:modelValue', v)"
  >
    <slot>{{ text }}</slot>
    <template
      v-if="closable"
      #actions
    >
      <v-btn
        variant="text"
        @click="$emit('update:modelValue', false)"
      >
        Close
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

export type AtlasSnackbarSeverity = 'info' | 'success' | 'warning' | 'danger'

interface Props {
  modelValue: boolean
  severity?: AtlasSnackbarSeverity
  text?: string
  timeout?: number
  location?: 'top' | 'bottom'
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  severity: 'info',
  text: undefined,
  timeout: 5000,
  location: 'bottom',
  closable: true,
})

defineEmits<{ 'update:modelValue': [open: boolean] }>()
defineOptions({ inheritAttrs: false })

const SEVERITY_COLOR: Record<AtlasSnackbarSeverity, string> = {
  info:    'info',
  success: 'success',
  warning: 'warning',
  danger:  'error',
}

const severityColor = computed(() => SEVERITY_COLOR[props.severity])

const attrs = useAttrs()
const forwardAttrs = computed(() => {
  const { color: _c, ...rest } = attrs as Record<string, unknown>
  void _c
  return rest
})
</script>
