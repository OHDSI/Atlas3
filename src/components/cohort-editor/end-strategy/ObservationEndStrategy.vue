<template>
  <div class="observation-end-strategy">
    <div class="strategy-hint">
      <AtlasIcon
        size="16"
        class="strategy-hint__icon"
      >
        mdi-information-outline
      </AtlasIcon>
      <span>{{ tv('components.endStrategy.observation.hint') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// No props or emits — purely informational
import { AtlasIcon } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'

const { tv } = useI18n()
</script>

<style scoped>
.observation-end-strategy {
  padding: 14px 0 6px;
}

.strategy-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.5;
}

.strategy-hint__icon {
  color: rgb(var(--v-theme-primary));
  opacity: 0.7;
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
