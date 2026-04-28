<template>
  <div class="page-wrapper">
    <div class="page-card">
      <header class="builder-shell__toolbar">
        <div class="builder-shell__toolbar-left">
          <v-btn
            v-if="showBack"
            variant="text"
            density="comfortable"
            prepend-icon="mdi-arrow-left"
            :data-testid="testid ? `${testid}-back` : undefined"
            @click="$emit('back')"
          >
            {{ t('common.backToCurrent', 'Back') }}
          </v-btn>
          <div class="builder-shell__heading">
            <h1
              v-if="title"
              class="builder-shell__title"
            >
              {{ title }}
            </h1>
            <p
              v-if="subtitle"
              class="builder-shell__subtitle"
            >
              {{ subtitle }}
            </p>
          </div>
        </div>
        <div class="builder-shell__toolbar-right">
          <slot name="actions" />
        </div>
      </header>

      <div
        v-if="$slots.banner"
        class="builder-shell__banner"
      >
        <slot name="banner" />
      </div>

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        closable
        density="compact"
        class="builder-shell__error"
        :data-testid="testid ? `${testid}-error` : undefined"
        @click:close="$emit('clear-error')"
      >
        {{ error }}
      </v-alert>

      <div class="builder-shell__body">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

interface Props {
  title?: string
  subtitle?: string
  error?: string | null
  showBack?: boolean
  testid?: string
}

withDefaults(defineProps<Props>(), {
  title: undefined,
  subtitle: undefined,
  error: null,
  showBack: true,
  testid: undefined,
})

defineEmits<{
  (e: 'back'): void
  (e: 'clear-error'): void
}>()

const { t } = useI18n()
</script>

<style scoped>
.page-wrapper {
  min-height: 100%;
  background-color: rgb(var(--v-theme-background));
  display: flex;
  padding: 24px;
  box-sizing: border-box;
}

.page-card {
  border-radius: 16px;
  background-color: rgb(var(--v-theme-surface));
  width: 100%;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 4px 12px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.builder-shell__toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 20px 28px;
  background: linear-gradient(
    to bottom,
    rgb(var(--v-theme-surface)) 80%,
    rgba(var(--v-theme-surface), 0)
  );
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.builder-shell__toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.builder-shell__heading {
  min-width: 0;
}

.builder-shell__title {
  font-size: 1.5rem;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.builder-shell__subtitle {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin: 2px 0 0;
}

.builder-shell__toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.builder-shell__banner {
  margin: 0 28px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(var(--v-theme-warning), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.85);
  font-size: 0.875rem;
}

.builder-shell__error {
  margin: 12px 28px 0;
  border-radius: 10px;
}

.builder-shell__body {
  padding: 24px 28px 28px;
}
</style>
