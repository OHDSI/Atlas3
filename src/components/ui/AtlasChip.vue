<template>
  <v-chip
    :color="resolvedColor"
    :size="vuetifySize"
    :closable="closable"
    :disabled="disabled"
    :prepend-icon="prependIcon"
    density="compact"
    v-bind="forwardAttrs"
    v-on="clickListeners"
    @click:close="$emit('close', $event)"
  >
    <slot />
  </v-chip>
</template>

<script setup lang="ts">
import { computed, useAttrs, getCurrentInstance } from 'vue'

export type AtlasChipTone = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger'
export type AtlasChipSize = 'xs' | 'sm' | 'md'

interface Props {
  tone?: AtlasChipTone
  size?: AtlasChipSize
  closable?: boolean
  disabled?: boolean
  prependIcon?: string
}

const props = withDefaults(defineProps<Props>(), {
  tone: undefined,
  size: 'md',
  closable: false,
  disabled: false,
  prependIcon: undefined,
})

const emit = defineEmits<{
  click: [event: MouseEvent | KeyboardEvent]
  close: [event: MouseEvent | KeyboardEvent]
}>()

defineOptions({ inheritAttrs: false })

// Vuetify's v-chip renders itself as clickable (pointer cursor + ripple) whenever a
// click listener is bound, even a no-op one. Only forward the listener when the
// consumer actually listens for 'click', so purely informational chips (e.g.
// vocabulary/domain badges) don't look interactive when they aren't.
const instance = getCurrentInstance()
const clickListeners = computed(() =>
  instance?.vnode.props?.onClick
    ? { click: (event: MouseEvent | KeyboardEvent) => emit('click', event) }
    : {},
)

const TONE_COLOR: Record<AtlasChipTone, string | undefined> = {
  neutral: undefined,
  primary: 'primary',
  info:    'info',
  success: 'success',
  warning: 'warning',
  danger:  'error',
}

const attrs = useAttrs()

const resolvedColor = computed(() => {
  if (props.tone !== undefined) return TONE_COLOR[props.tone]
  const passthrough = (attrs as Record<string, unknown>).color
  return typeof passthrough === 'string' ? passthrough : undefined
})

const vuetifySize = computed(() => {
  if (props.size === 'xs') return 'x-small'
  if (props.size === 'sm') return 'small'
  return undefined
})

const forwardAttrs = computed(() => {
  const { color: _c, size: _s, density: _d, ...rest } = attrs as Record<string, unknown>
  void _c; void _s; void _d
  return rest
})
</script>
