<script setup lang="ts">
import { AtlasProgressCircular } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'

defineProps<{ active: boolean }>()

const { tv } = useI18n()
</script>

<template>
  <Transition name="concept-detail-loading-spinner">
    <div
      v-if="active"
      class="concept-detail-loading-spinner"
      role="status"
      aria-live="polite"
      :aria-label="tv('common.loadingWithDots')"
      data-testid="concept-detail-loading-spinner"
    >
      <AtlasProgressCircular
        indeterminate
        color="primary"
        :size="48"
        :width="4"
      />
    </div>
  </Transition>
</template>

<style scoped>
/* Fixed so it stays centred in the visible area however far the user has
 * scrolled. Inside a navigation drawer (which is transformed) "fixed" resolves
 * to the drawer, so there it centres in the drawer instead of the window. */
.concept-detail-loading-spinner {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 6;
  padding: 14px;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  pointer-events: none;
  line-height: 0;
}
.concept-detail-loading-spinner-enter-active,
.concept-detail-loading-spinner-leave-active {
  transition: opacity 150ms ease;
}
.concept-detail-loading-spinner-enter-from,
.concept-detail-loading-spinner-leave-to {
  opacity: 0;
}
</style>
