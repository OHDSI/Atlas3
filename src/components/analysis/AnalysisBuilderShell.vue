<template>
  <AtlasPageShell
    hero
    compact
    :eyebrow="eyebrow"
    :title="title"
    :subtitle="subtitle"
  >
    <template
      v-if="$slots.title"
      #title
    >
      <slot name="title" />
    </template>
    <template
      v-if="$slots.subtitle"
      #subtitle
    >
      <slot name="subtitle" />
    </template>
    <template #actions>
      <v-btn
        v-if="showBack"
        variant="text"
        size="small"
        density="comfortable"
        prepend-icon="mdi-arrow-left"
        :data-testid="testid ? `${testid}-back` : undefined"
        @click="$emit('back')"
      >
        {{ backLabel ?? t('common.back', 'Back').value }}
      </v-btn>
      <slot name="actions" />
    </template>

    <div class="builder-shell">
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
  </AtlasPageShell>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { AtlasPageShell } from '@/components/ui'

interface Props {
  title?: string
  subtitle?: string
  /**
   * Optional eyebrow text for the hero header (e.g. "OHDSI ·
   * Characterization"). When omitted no eyebrow is rendered.
   */
  eyebrow?: string
  error?: string | null
  showBack?: boolean
  backLabel?: string
  testid?: string
}

withDefaults(defineProps<Props>(), {
  title: undefined,
  subtitle: undefined,
  eyebrow: undefined,
  error: null,
  showBack: true,
  backLabel: undefined,
  testid: undefined,
})

defineEmits<{
  (e: 'back'): void
  (e: 'clear-error'): void
}>()

const { t } = useI18n()
</script>

<style scoped>
.builder-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.builder-shell__banner {
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(var(--v-theme-warning, 255, 152, 0), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.85);
  font-size: 0.875rem;
}

.builder-shell__error {
  border-radius: 10px;
}

.builder-shell__body {
  /* Body sits flush in the page-shell card. Inner content
   * controls its own spacing. */
}
</style>
