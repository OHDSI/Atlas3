<template>
  <component
    :is="tag"
    :class="[
      'atlas-card',
      interactive && 'atlas-card--interactive',
      `atlas-card--padding-${padding}`,
    ]"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
interface Props {
  tag?: string
  interactive?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<Props>(), {
  tag: 'div',
  interactive: false,
  padding: 'md',
})
</script>

<style scoped>
.atlas-card {
  background-color: rgb(var(--v-theme-surface));
  border-radius: var(--atlas-radius-lg);
  box-shadow:
    var(--atlas-elevation-ambient),
    var(--atlas-elevation-diffuse);
  box-sizing: border-box;
  text-decoration: none;
  color: inherit;
  transition:
    box-shadow var(--atlas-motion-med),
    transform var(--atlas-motion-med);
}

.atlas-card--padding-none { padding: 0; }
.atlas-card--padding-sm   { padding: var(--atlas-spacing-md); }
.atlas-card--padding-md   { padding: 20px; }
.atlas-card--padding-lg   { padding: var(--atlas-spacing-xl); }

.atlas-card--interactive {
  cursor: pointer;
}

.atlas-card--interactive:hover {
  box-shadow:
    0 2px 6px rgba(15, 23, 42, 0.1),
    0 12px 32px rgba(15, 23, 42, 0.12);
  transform: translateY(-2px);
}

.atlas-card--interactive:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
</style>
