<!-- src/components/ui/AtlasSideSheet.vue -->
<!--
  Full-height panel that slides in from the right, built on VDialog so it
  joins Vuetify's global overlay stack. Every overlay opened from inside it
  (menus, selects, tooltips, dialogs, another side sheet) is stacked above it
  automatically — no z-index overrides, manual teleports, or body scroll locks.
-->
<template>
  <v-dialog
    :model-value="modelValue"
    :width="width"
    :persistent="persistent"
    :scrim="scrim"
    :close-on-back="false"
    transition="atlas-side-sheet-transition"
    class="atlas-side-sheet"
    :content-class="['atlas-side-sheet__panel', contentClass]"
    :aria-label="ariaLabel"
    v-bind="$attrs"
    @update:model-value="onModelValueUpdate"
  >
    <slot />
  </v-dialog>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { VDialog } from 'vuetify/components'

interface Props {
  modelValue: boolean
  width?: number | string
  persistent?: boolean
  scrim?: boolean
  ariaLabel?: string
  contentClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: 'max(500px, 95vw)',
  persistent: false,
  scrim: true,
  ariaLabel: undefined,
  contentClass: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
}>()

defineOptions({ inheritAttrs: false })

// The sheet has no activator, so VDialog can't return focus on close; restore
// it to whatever had focus when the sheet opened.
const previouslyFocused = ref<HTMLElement | null>(null)

watch(
  () => props.modelValue,
  (open, prev) => {
    if (typeof document === 'undefined') return
    if (open && !prev) {
      const active = document.activeElement as HTMLElement | null
      previouslyFocused.value = active && typeof active.focus === 'function' ? active : null
      return
    }
    if (!open && prev) {
      const target = previouslyFocused.value
      previouslyFocused.value = null
      if (target?.isConnected) nextTick(() => target.focus({ preventScroll: true }))
    }
  },
  { immediate: true },
)

function onModelValueUpdate(open: boolean) {
  emit('update:modelValue', open)
}
</script>

<style>
/* Unscoped: VDialog teleports the overlay out of this component's subtree. */
.v-dialog.atlas-side-sheet {
  align-items: stretch;
  justify-content: flex-end;
  margin: 0;
}

.v-dialog.atlas-side-sheet > .v-overlay__content.atlas-side-sheet__panel {
  position: relative;
  margin: 0;
  height: 100%;
  max-height: 100%;
  max-width: 100%;
  border-radius: 0;
  overflow: hidden;
  overscroll-behavior: contain;
  background: rgb(var(--v-theme-surface));
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.12);
}

.atlas-side-sheet-transition-enter-active,
.atlas-side-sheet-transition-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.atlas-side-sheet-transition-enter-from,
.atlas-side-sheet-transition-leave-to {
  transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .atlas-side-sheet-transition-enter-active,
  .atlas-side-sheet-transition-leave-active {
    transition: none;
  }
}
</style>
