<!-- src/components/ui/AtlasDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="maxWidth"
    :persistent="persistent"
    :width="width"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="title ? titleId : undefined"
    v-bind="forwardAttrs"
    @update:model-value="onModelValueUpdate"
  >
    <slot
      v-if="chromeless"
    />
    <v-card
      v-else
      class="atlas-dialog__card"
    >
      <header class="atlas-dialog__header">
        <div class="atlas-dialog__title-block">
          <div class="atlas-dialog__eyebrow-row">
            <span class="text-eyebrow">{{ eyebrow }}</span>
            <span class="atlas-dialog__accent-rule" />
          </div>
          <h2
            v-if="title"
            :id="titleId"
            class="atlas-dialog__title"
          >
            {{ title }}
          </h2>
          <p
            v-if="subtitle"
            class="atlas-dialog__subtitle"
          >
            {{ subtitle }}
          </p>
        </div>
        <AtlasIconButton
          v-if="showClose"
          icon="mdi-close"
          variant="text"
          size="sm"
          tone="neutral"
          v-bind="{ ariaLabel: resolvedCloseLabel }"
          @click="closeFromButton"
        />
      </header>

      <v-divider />

      <div class="atlas-dialog__body">
        <slot />
      </div>

      <div
        v-if="$slots.actions"
        class="atlas-dialog__actions"
      >
        <slot name="actions" />
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useAttrs, watch } from 'vue'
import { VDialog, VCard, VDivider } from 'vuetify/components'
import AtlasIconButton from './AtlasIconButton.vue'

interface Props {
  modelValue: boolean
  eyebrow?: string
  title?: string
  subtitle?: string
  maxWidth?: number | string
  width?: number | string
  persistent?: boolean
  showClose?: boolean
  closeLabel?: string
  chromeless?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  eyebrow: '',
  title: undefined,
  subtitle: undefined,
  maxWidth: 560,
  width: undefined,
  persistent: false,
  showClose: true,
  closeLabel: undefined,
  chromeless: false,
})

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  close: []
}>()

defineOptions({ inheritAttrs: false })

const titleId = `atlas-dialog-title-${Math.random().toString(36).slice(2, 10)}`

const resolvedCloseLabel = computed(() => {
  return props.closeLabel ?? 'Close dialog'
})

const attrs = useAttrs()
const forwardAttrs = computed(() => {
  const { 'max-width': _mw, maxWidth: _mw2, persistent: _p, width: _w, ...rest } = attrs as Record<string, unknown>
  void _mw; void _mw2; void _p; void _w
  return rest
})

const previouslyFocused = ref<HTMLElement | null>(null)

watch(
  () => props.modelValue,
  (open, prev) => {
    if (open && !prev) {
      const active = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null
      previouslyFocused.value = active && typeof active.focus === 'function' ? active : null
      return
    }
    if (!open && prev) {
      const target = previouslyFocused.value
      previouslyFocused.value = null
      if (target && typeof target.focus === 'function') {
        nextTick(() => {
          try {
            target.focus()
          } catch {
            void 0
          }
        })
      }
    }
  },
  { immediate: true }
)

function onModelValueUpdate(open: boolean) {
  emit('update:modelValue', open)
  if (!open) emit('close')
}

function closeFromButton() {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<style scoped>
.atlas-dialog__card {
  background-color: rgb(var(--v-theme-surface));
}

.atlas-dialog__header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 24px 14px;
}

.atlas-dialog__title-block {
  flex: 1;
  min-width: 0;
}

.atlas-dialog__eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.atlas-dialog__accent-rule {
  display: inline-block;
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}

.atlas-dialog__title {
  font-size: 22px;
  font-weight: 500;
  line-height: 1.3;
  margin: 0;
  color: rgb(var(--v-theme-primary));
}

.atlas-dialog__subtitle {
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 4px 0 0;
}

.atlas-dialog__body {
  padding: 20px 24px;
}

.atlas-dialog__actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 12px 24px 20px;
}
</style>
