<template>
  <v-btn
    :color="vuetifyProps.color"
    :variant="vuetifyProps.variant"
    :size="vuetifyProps.size"
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

export type AtlasButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
export type AtlasButtonSize = 'sm' | 'md' | 'lg'

interface Props {
  variant?: AtlasButtonVariant
  size?: AtlasButtonSize
  loading?: boolean
  disabled?: boolean
  icon?: string
  iconPosition?: 'start' | 'end'
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  icon: undefined,
  iconPosition: 'start',
  type: 'button',
})

defineEmits<{ click: [event: MouseEvent] }>()

defineOptions({ inheritAttrs: false })

type VBtnVariant = 'flat' | 'elevated' | 'tonal' | 'outlined' | 'text' | 'plain'

const VARIANT_MAP: Record<AtlasButtonVariant, { color?: string; variant: VBtnVariant }> = {
  primary:   { color: 'primary', variant: 'flat' },
  secondary: { color: 'primary', variant: 'outlined' },
  danger:    { color: 'error',   variant: 'flat' },
  ghost:     { variant: 'text' },
  link:      { variant: 'plain' },
}

const vuetifyProps = computed(() => {
  const mapping = VARIANT_MAP[props.variant] ?? VARIANT_MAP.primary
  return {
    color: mapping.color,
    variant: mapping.variant,
    size: props.size === 'sm' ? 'small' : props.size === 'lg' ? 'large' : undefined,
  }
})

const attrs = useAttrs()
const forwardAttrs = computed(() => {
  const { color: _c, variant: _v, size: _s, ...rest } = attrs as Record<string, unknown>
  void _c; void _v; void _s
  return rest
})
</script>
