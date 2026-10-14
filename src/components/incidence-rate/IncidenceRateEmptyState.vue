<template>
  <div
    class="ir-empty"
    :data-testid="`ir-empty-${variant}`"
  >
    <div class="ir-empty__icon">
      {{ icon }}
    </div>
    <h3>{{ title }}</h3>
    <p>{{ hint }}</p>
    <p
      v-if="variant === 'run-failed' && errorMessage"
      class="ir-empty__error"
    >
      {{ errorMessage }}
    </p>
    <AtlasButton
      v-if="ctaLabel"
      data-testid="ir-empty-cta"
      @click="$emit('run')"
    >
      {{ ctaLabel }}
    </AtlasButton>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasButton } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'

type Variant = 'no-id' | 'no-runs' | 'run-pending' | 'run-failed' | 'select-to'

const props = defineProps<{
  variant: Variant
  errorMessage?: string
}>()
defineEmits<{ run: [] }>()

const { t } = useI18n()

const icon = computed(() => {
  switch (props.variant) {
    case 'no-id':       return ''
    case 'no-runs':     return ''
    case 'run-pending': return ''
    case 'run-failed':  return ''
    case 'select-to':   return ''
    default:            return ''
  }
})

const title = computed(() => {
  switch (props.variant) {
    case 'no-id':       return t('ir.workbench.saveFirstTitle').value
    case 'no-runs':     return t('ir.workbench.noRunsTitle').value
    case 'run-pending': return t('ir.workbench.runPendingTitle').value
    case 'run-failed':  return t('ir.workbench.runFailedTitle').value
    case 'select-to':   return t('ir.workbench.selectToTitle').value
    default:            return ''
  }
})

const hint = computed(() => {
  switch (props.variant) {
    case 'no-id':       return t('ir.workbench.saveFirstHint').value
    case 'no-runs':     return t('ir.workbench.noRunsHint').value
    case 'run-pending': return t('ir.workbench.runPendingHint').value
    case 'run-failed':  return t('ir.workbench.runFailedHint').value
    case 'select-to':   return t('ir.workbench.selectToHint').value
    default:            return ''
  }
})

const ctaLabel = computed(() => {
  switch (props.variant) {
    case 'no-runs':    return t('components.generation.generate').value
    case 'run-failed': return t('common.retry').value
    default:           return ''
  }
})
</script>

<style scoped>
.ir-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: rgb(var(--v-theme-surface));
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 8px;
  padding: 32px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  gap: 8px;
}
.ir-empty h3 {
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
  font-weight: 500;
  font-size: 16px;
}
.ir-empty p { margin: 0; max-width: 360px; font-size: 13px; }
.ir-empty__icon { font-size: 42px; opacity: 0.7; line-height: 1; }
.ir-empty__error {
  color: rgb(var(--v-theme-error));
  font-size: 12px;
  background: rgba(var(--v-theme-error), 0.08);
  padding: 6px 10px;
  border-radius: 4px;
}
</style>
