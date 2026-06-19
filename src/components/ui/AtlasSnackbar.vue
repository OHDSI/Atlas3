<!-- src/components/ui/AtlasSnackbar.vue -->
<template>
  <v-snackbar
    :model-value="modelValue"
    :timeout="timeout"
    :location="location"
    :role="ariaRole"
    :aria-live="ariaLive"
    color="transparent"
    :elevation="0"
    content-class="atlas-snackbar__content"
    @update:model-value="(v: boolean) => $emit('update:modelValue', v)"
  >
    <AtlasFeedbackBody
      :severity="severity"
      :title="title"
      :closable="closable"
      elevated
      @close="$emit('update:modelValue', false)"
    >
      <slot>{{ text }}</slot>
      <template
        v-if="$slots.actions"
        #actions
      >
        <slot name="actions" />
      </template>
    </AtlasFeedbackBody>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AtlasFeedbackBody from './AtlasFeedbackBody.vue'

export type AtlasSnackbarSeverity = 'info' | 'success' | 'warning' | 'danger'

interface Props {
  modelValue: boolean
  severity?: AtlasSnackbarSeverity
  title?: string
  text?: string
  timeout?: number
  location?: 'top' | 'bottom'
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  severity: 'info',
  title: undefined,
  text: undefined,
  timeout: 5000,
  location: 'bottom',
  closable: true,
})

defineEmits<{ 'update:modelValue': [open: boolean] }>()

const isAssertive = computed(() => props.severity === 'danger')
const ariaRole = computed(() => (isAssertive.value ? 'alert' : 'status'))
const ariaLive = computed(() => (isAssertive.value ? 'assertive' : 'polite'))
</script>

<style scoped>
:deep(.atlas-snackbar__content) {
  padding: 0;
  background: transparent;
  box-shadow: none;
  min-width: 360px;
  max-width: 420px;
}
</style>
