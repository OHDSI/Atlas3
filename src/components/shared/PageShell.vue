<template>
  <div class="page-wrapper">
    <div class="page-card">
      <div
        v-if="hasHeader"
        class="page-header"
      >
        <div class="page-header__text">
          <h1
            v-if="title"
            class="page-header__title text-page-title"
          >
            {{ title }}
          </h1>
          <p
            v-if="subtitle"
            class="page-header__subtitle text-page-subtitle"
          >
            {{ subtitle }}
          </p>
        </div>
        <div
          v-if="$slots.actions"
          class="page-header__actions"
        >
          <slot name="actions" />
        </div>
      </div>

      <div class="page-card__body">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

interface Props {
  title?: string
  subtitle?: string
}

const props = defineProps<Props>()
const slots = useSlots()

const hasHeader = computed(() => Boolean(props.title || slots.actions))
</script>

<style scoped>
.page-wrapper {
  min-height: 100%;
  background-color: rgb(var(--v-theme-surface-variant));
  display: flex;
  padding: 24px;
  box-sizing: border-box;
}

.page-card {
  /* MD3 "elevated" card: surface fill + soft shadow, no outline.
   * The shadow uses two passes — a tight 1-2px ambient and a wider
   * 8-16px diffuse — which reads as a soft lift instead of a hard
   * line. Replaces the previous outline-variant border. */
  background-color: rgb(var(--v-theme-surface));
  border-radius: 12px;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 4px 12px rgba(15, 23, 42, 0.04);
  width: 100%;
  padding: 32px;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header__text {
  flex: 1;
  min-width: 0;
}

.page-header__title {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  margin: 0;
}

.page-header__subtitle {
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 4px 0 0;
}

.page-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.page-card__body {
  /* Body sits flush inside the card. Inner content controls its own spacing. */
}
</style>
