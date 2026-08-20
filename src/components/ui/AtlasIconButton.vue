<template>
  <v-btn
    :icon="icon"
    :color="vuetifyProps.color"
    :variant="vuetifyProps.variant"
    :size="vuetifyProps.size"
    :loading="loading"
    :disabled="disabled"
    :aria-label="resolvedAriaLabel"
    v-bind="forwardAttrs"
    @click="$emit('click', $event)"
  />
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

export type AtlasIconButtonVariant = 'tonal' | 'text' | 'flat'
export type AtlasIconButtonSize = 'sm' | 'md' | 'lg'
export type AtlasIconButtonTone = 'primary' | 'neutral' | 'danger'

interface Props {
  icon: string
  ariaLabel?: string
  variant?: AtlasIconButtonVariant
  size?: AtlasIconButtonSize
  tone?: AtlasIconButtonTone
  loading?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  ariaLabel: '',
  variant: 'tonal',
  size: 'md',
  tone: 'neutral',
})

defineEmits<{ click: [event: MouseEvent] }>()
defineOptions({ inheritAttrs: false })

const TONE_COLOR: Record<AtlasIconButtonTone, string | undefined> = {
  primary: 'primary',
  neutral: undefined,
  danger: 'error',
}

const vuetifyProps = computed(() => ({
  color: TONE_COLOR[props.tone],
  variant: props.variant,
  size: props.size === 'sm' ? 'small' : props.size === 'lg' ? 'large' : undefined,
}))

const resolvedAriaLabel = computed(() => props.ariaLabel)

const attrs = useAttrs()
const forwardAttrs = computed(() => {
  const { color: _c, size: _s, icon: _i, variant: _v, ...rest } = attrs as Record<string, unknown>
  void _c; void _s; void _i; void _v
  return rest
})
</script>
