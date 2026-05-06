<template>
  <v-btn
    :color="resolvedColor"
    :variant="resolvedVariant"
    :size="resolvedSize"
    :loading="loading"
    :disabled="disabled"
    :type="type"
    :prepend-icon="iconPosition === 'start' ? icon : undefined"
    :append-icon="iconPosition === 'end' ? icon : undefined"
    v-bind="forwardAttrs"
    @click="$emit('click', $event)"
  >
    <slot />
  </v-btn>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

export type AtlasButtonVariant = 'primary' | 'secondary' | 'tonal' | 'danger' | 'ghost' | 'link'
export type AtlasButtonSize = 'xs' | 'sm' | 'md' | 'lg'
export type AtlasButtonTone = 'primary' | 'neutral' | 'warning' | 'danger' | 'success' | 'info'

interface Props {
  variant?: AtlasButtonVariant
  size?: AtlasButtonSize
  tone?: AtlasButtonTone
  loading?: boolean
  disabled?: boolean
  icon?: string
  iconPosition?: 'start' | 'end'
  type?: 'button' | 'submit' | 'reset'
  toggle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  tone: undefined,
  icon: undefined,
  iconPosition: 'start',
  type: 'button',
  toggle: false,
})

defineEmits<{ click: [event: MouseEvent] }>()

defineOptions({ inheritAttrs: false })

type VBtnVariant = 'flat' | 'elevated' | 'tonal' | 'outlined' | 'text' | 'plain'

const VARIANT_MAP: Record<AtlasButtonVariant, { color?: string; variant: VBtnVariant }> = {
  primary:   { color: 'primary', variant: 'flat' },
  secondary: { color: 'primary', variant: 'outlined' },
  tonal:     { color: 'primary', variant: 'tonal' },
  danger:    { color: 'error',   variant: 'flat' },
  ghost:     { variant: 'text' },
  link:      { variant: 'plain' },
}

const TONE_COLOR: Record<AtlasButtonTone, string | undefined> = {
  primary: 'primary',
  neutral: undefined,
  warning: 'warning',
  danger:  'error',
  success: 'success',
  info:    'info',
}

const attrs = useAttrs()

const resolvedColor = computed(() => {
  if (props.toggle) return undefined
  if (props.tone) return TONE_COLOR[props.tone]
  return (VARIANT_MAP[props.variant] ?? VARIANT_MAP.primary).color
})

const resolvedVariant = computed(() => {
  if (props.toggle) return undefined
  return (VARIANT_MAP[props.variant] ?? VARIANT_MAP.primary).variant
})

const resolvedSize = computed(() => {
  if (props.size === 'xs') return 'x-small'
  if (props.size === 'sm') return 'small'
  if (props.size === 'lg') return 'large'
  return undefined
})

const forwardAttrs = computed(() => {
  const { color: _c, variant: _v, size: _s, ...rest } = attrs as Record<string, unknown>
  void _c; void _v; void _s
  return rest
})
</script>
