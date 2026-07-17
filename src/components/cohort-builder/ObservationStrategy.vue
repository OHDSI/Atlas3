<template>
  <div class="observation-strategy">
    <!-- Strategy-specific help text -->
    <div class="strategy-hint">
      <AtlasIcon
        icon="mdi-information-outline"
        size="16"
        class="strategy-hint-icon"
      />
      <span>{{
        tv(
          'options.endOfContinuousObservation',
          'Event persists until observation period ends'
        )
      }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasIcon } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'

const { tv } = useI18n()

withDefaults(
  defineProps<{
    disabled?: boolean
  }>(),
  {
    disabled: false,
  }
)
</script>

<style scoped>
.observation-strategy {
  padding: 12px 16px;
}

.strategy-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.5;
}

.strategy-hint-icon {
  color: rgb(var(--v-theme-primary));
  opacity: 0.7;
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
