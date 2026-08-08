<!-- src/components/ui/AtlasSwitch.vue -->
<template>
  <v-switch
    class="atlas-switch"
    :model-value="modelValue"
    :label="label"
    :disabled="disabled"
    :color="toneColor"
    :error-messages="errorMessages"
    :aria-required="required ? 'true' : undefined"
    :aria-invalid="hasError ? 'true' : undefined"
    density="compact"
    inset
    :ripple="false"
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
  error?: string
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  label: undefined,
  disabled: false,
  tone: 'primary',
  error: undefined,
  required: false,
})

defineEmits<{ 'update:modelValue': [value: boolean] }>()
defineOptions({ inheritAttrs: false })

const TONE_COLOR: Record<AtlasSwitchTone, string> = {
  primary: 'primary',
  success: 'success',
  danger:  'error',
}

const toneColor = computed(() => TONE_COLOR[props.tone])

const errorMessages = computed(() => (props.error ? [props.error] : undefined))

const hasError = computed(() => !!props.error)

const attrs = useAttrs()
const forwardAttrs = computed(() => {
  const { density: _d, color: _c, ...rest } = attrs as Record<string, unknown>
  void _d; void _c
  return rest
})
</script>

<style scoped>
/* Compact inset switch tuned to the Atlas look: the stock Vuetify switch
 * renders an oversized floating thumb whose off state is a white knob on a
 * white card (invisible track), and the label sits flush against the thumb.
 * Give the track a visible outline in the off state, scale the control to
 * the app's compact density, and put breathing room before the label. */
.atlas-switch :deep(.v-switch__track) {
  height: 20px;
  min-width: 36px;
  border: 1px solid var(--atlas-color-outline-strong);
  background: var(--atlas-color-surface-variant);
  opacity: 1;
}
.atlas-switch :deep(.v-selection-control--dirty .v-switch__track) {
  border-color: transparent;
  background: currentColor;
  opacity: 1;
}
.atlas-switch :deep(.v-switch__thumb) {
  height: 14px;
  width: 14px;
  background: var(--atlas-color-surface);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.25);
}
.atlas-switch :deep(.v-selection-control) {
  min-height: 28px;
}
.atlas-switch :deep(.v-label) {
  margin-inline-start: 8px;
  font-size: 0.875rem;
  opacity: 0.85;
}
</style>
