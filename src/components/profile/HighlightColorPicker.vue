<template>
  <div class="highlight-color-picker">
    <div class="d-flex ga-2 align-center">
      <button
        v-for="c in palette"
        :key="c"
        type="button"
        class="swatch"
        :style="{ background: c }"
        :title="c"
        data-test="highlight-swatch"
        @click="$emit('select', c)"
      />
    </div>
    <v-btn
      size="small"
      variant="text"
      class="mt-2"
      data-test="highlight-clear"
      @click="$emit('clear')"
    >{{ tv('profiles.clearAllHighlightColors', 'Clear all highlight colors') }}</v-btn>
  </div>
</template>

<script setup lang="ts">
import { HIGHLIGHT_PALETTE, type HighlightColor } from '@/models/profile.types'
import { useI18n } from '@/composables/useI18n'

defineEmits<{
  (e: 'select', color: HighlightColor): void
  (e: 'clear'): void
}>()

const palette = HIGHLIGHT_PALETTE
const { tv } = useI18n()
</script>

<style scoped>
.swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
.swatch:hover { transform: scale(1.1); }
</style>
