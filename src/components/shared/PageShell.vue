<template>
  <div class="page-wrapper">
    <SurfaceCard
      class="page-card"
      padding="lg"
    >
      <div
        v-if="hasHeader"
        :class="['page-header', { 'page-header--hero': hero }]"
      >
        <div class="page-header__text">
          <div
            v-if="hero && (eyebrow || title)"
            class="page-header__eyebrow-row"
          >
            <span
              v-if="eyebrow"
              class="text-eyebrow"
            >{{ eyebrow }}</span>
            <span
              v-if="hero"
              class="page-header__accent-rule"
            />
          </div>
          <h1
            v-if="title"
            :class="hero ? 'page-header__title page-header__title--hero' : 'page-header__title text-page-title'"
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
    </SurfaceCard>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import SurfaceCard from './SurfaceCard.vue'

interface Props {
  title?: string
  subtitle?: string
  /**
   * When true, renders the header in a hero style: optional eyebrow
   * + orange accent rule + larger display-weight title. Echoes the
   * LandingView hero treatment for pages that want more visual
   * presence than the standard quiet shell.
   */
  hero?: boolean
  /**
   * Optional eyebrow text shown above the title in hero mode
   * (e.g. "OHDSI · CDM"). Ignored when hero is false.
   */
  eyebrow?: string
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
  /* SurfaceCard provides surface, radius, shadow, and padding.
   * PageShell only adds full-width sizing on top. */
  width: 100%;
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

/* Hero header: matches the LandingView treatment but tuned down a
 * notch (32px vs the landing's 40px) so it works at the top of a
 * working page without dominating. */
.page-header--hero {
  margin-bottom: 28px;
}

.page-header__eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.page-header__accent-rule {
  display: inline-block;
  width: 32px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}

.page-header__title--hero {
  font-size: 32px;
  font-weight: 300;
  line-height: 1.15;
  letter-spacing: 0.01em;
  color: rgb(var(--v-theme-primary));
  margin: 0;
}

.page-header--hero .page-header__subtitle {
  font-size: 14px;
  margin-top: 8px;
  max-width: 640px;
  line-height: 1.5;
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
