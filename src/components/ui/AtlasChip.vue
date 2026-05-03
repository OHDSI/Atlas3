<template>
  <v-chip
    :color="toneColor"
    :size="vuetifySize"
    :closable="closable"
    :disabled="disabled"
    :prepend-icon="prependIcon"
    density="compact"
    v-bind="forwardAttrs"
    @click="$emit('click', $event)"
    @click:close="$emit('close', $event)"
  >
    <slot />
  </v-chip>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

export type AtlasChipTone = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger'
export type AtlasChipSize = 'sm' | 'md'

interface Props {
  tone?: AtlasChipTone
  size?: AtlasChipSize
  closable?: boolean
  disabled?: boolean
  prependIcon?: string
}

const props = withDefaults(defineProps<Props>(), {
  tone: 'neutral',
  size: 'md',
  closable: false,
  disabled: false,
  prependIcon: undefined,
})

defineEmits<{
  click: [event: MouseEvent | KeyboardEvent]
  close: [event: MouseEvent | KeyboardEvent]
}>()

defineOptions({ inheritAttrs: false })

const TONE_COLOR: Record<AtlasChipTone, string | undefined> = {
  neutral: undefined,
  primary: 'primary',
  info:    'info',
  success: 'success',
  warning: 'warning',
  danger:  'error',
}

const toneColor = computed(() => TONE_COLOR[props.tone])
const vuetifySize = computed(() => (props.size === 'sm' ? 'small' : undefined))

const attrs = useAttrs()
const forwardAttrs = computed(() => {
  const { color: _c, size: _s, density: _d, ...rest } = attrs as Record<string, unknown>
  void _c; void _s; void _d
  return rest
})
</script>
