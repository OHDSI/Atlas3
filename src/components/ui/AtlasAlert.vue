<!-- src/components/ui/AtlasAlert.vue -->
<template>
  <AtlasFeedbackBody
    :severity="severity"
    :tone="tone"
    :title="title"
    :count="count"
    :closable="closable"
    :prepend-icon="prependIcon"
    @close="$emit('close')"
  >
    <slot />
    <template v-if="$slots.details" #details><slot name="details" /></template>
    <template v-if="$slots.actions" #actions><slot name="actions" /></template>
    <template v-if="$slots.append" #append><slot name="append" /></template>
  </AtlasFeedbackBody>
</template>

<script setup lang="ts">
import AtlasFeedbackBody from './AtlasFeedbackBody.vue'

export type AtlasAlertSeverity = 'info' | 'success' | 'warning' | 'danger'

interface Props {
  severity?: AtlasAlertSeverity
  tone?: 'severity' | 'neutral'
  title?: string
  count?: number
  closable?: boolean
  prependIcon?: string
}

withDefaults(defineProps<Props>(), {
  severity: 'info',
  tone: 'severity',
  title: undefined,
  count: undefined,
  closable: false,
  prependIcon: undefined,
})

defineEmits<{ close: [] }>()
</script>
