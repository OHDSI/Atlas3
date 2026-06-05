<template>
  <v-theme-provider
    :theme="theme"
    with-background
    style="min-height: 100%;"
  >
    <div style="position: relative; padding: 24px;">
      <button
        type="button"
        class="story-theme-toggle"
        aria-label="Toggle theme"
        :aria-pressed="theme === 'dark'"
        @click="theme = theme === 'dark' ? 'light' : 'dark'"
      >
        {{ theme === 'dark' ? '☾ Dark' : '☀ Light' }}
      </button>
      <slot />
    </div>
  </v-theme-provider>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const theme = ref<'light' | 'dark'>('light')
</script>

<style scoped>
.story-theme-toggle {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: var(--atlas-radius-md);
  border: 1px solid rgb(var(--v-theme-outline));
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
}

.story-theme-toggle:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
</style>
