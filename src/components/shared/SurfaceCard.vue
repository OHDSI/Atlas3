<template>
  <component
    :is="tag"
    :class="['surface-card', interactive && 'surface-card--interactive', `surface-card--padding-${padding}`]"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /**
   * HTML tag the card renders as. Use 'a' or 'router-link' for
   * clickable cards (combine with the interactive prop for the
   * hover lift). Defaults to a div.
   */
  tag?: string
  /**
   * Adds a soft hover lift (shadow grows + translateY) and changes
   * cursor. Use for clickable / linkable cards.
   */
  interactive?: boolean
  /**
   * Internal padding preset:
   *   - none  → 0 (caller controls spacing)
   *   - sm    → 16px
   *   - md    → 20px (default)
   *   - lg    → 32px (use for the main page card)
   */
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  tag: 'div',
  interactive: false,
  padding: 'md',
})

// Surface this so consumers can read the prop pattern from devtools.
void computed(() => props)
</script>

<style scoped>
/*
 * SurfaceCard — the single source of truth for the modern MD3
 * "elevated" card look used across the app. Replaces the bespoke
 * border/shadow rules previously duplicated on .page-card,
 * .landing__hero, .landing__feature, .landing__documentation,
 * .datasources-view__report, .chart-section, etc.
 *
 * Pattern: white surface, no outline, soft two-pass shadow
 * (1-2px ambient + 4-12px diffuse). On interactive cards, the
 * shadow grows and the card lifts 2px on hover.
 */
.surface-card {
  background-color: rgb(var(--v-theme-surface));
  border-radius: 12px;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 4px 12px rgba(15, 23, 42, 0.04);
  box-sizing: border-box;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 160ms ease, transform 160ms ease;
}

.surface-card--padding-none {
  padding: 0;
}
.surface-card--padding-sm {
  padding: 16px;
}
.surface-card--padding-md {
  padding: 20px;
}
.surface-card--padding-lg {
  padding: 32px;
}

.surface-card--interactive {
  cursor: pointer;
}

.surface-card--interactive:hover {
  box-shadow:
    0 2px 4px rgba(15, 23, 42, 0.06),
    0 8px 20px rgba(15, 23, 42, 0.08);
  transform: translateY(-2px);
}

.surface-card--interactive:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
</style>
