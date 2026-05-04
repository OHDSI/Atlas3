<!-- src/components/ui/AtlasAlert.vue -->
<template>
  <v-alert
    :type="alertType"
    :title="title"
    :variant="variant"
    :closable="closable"
    :icon="resolvedIcon"
    v-bind="forwardAttrs"
    @click:close="$emit('close')"
  >
    <slot />
  </v-alert>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

export type AtlasAlertSeverity = 'info' | 'success' | 'warning' | 'danger'

interface Props {
  severity?: AtlasAlertSeverity
  title?: string
  closable?: boolean
  variant?: 'tonal' | 'outlined' | 'flat'
  prependIcon?: string
}

const props = withDefaults(defineProps<Props>(), {
  severity: 'info',
  title: undefined,
  closable: false,
  variant: 'tonal',
  prependIcon: undefined,
})

defineEmits<{ close: [] }>()
defineOptions({ inheritAttrs: false })

const SEVERITY_ALERT_TYPE: Record<AtlasAlertSeverity, 'info' | 'success' | 'warning' | 'error'> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'error',
}

const SEVERITY_ICON: Record<AtlasAlertSeverity, string> = {
  info: 'mdi-information',
  success: 'mdi-check-circle',
  warning: 'mdi-alert',
  danger: 'mdi-alert-circle',
}

const alertType = computed(() => SEVERITY_ALERT_TYPE[props.severity])
const resolvedIcon = computed(() => props.prependIcon ?? SEVERITY_ICON[props.severity])

const attrs = useAttrs()
const forwardAttrs = computed(() => {
  const { type: _t, color: _c, ...rest } = attrs as Record<string, unknown>
  void _t; void _c
  return rest
})
</script>
