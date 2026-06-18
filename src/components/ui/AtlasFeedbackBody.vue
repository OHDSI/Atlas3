<!-- src/components/ui/AtlasFeedbackBody.vue -->
<template>
  <div
    :class="['atlas-feedback', `atlas-feedback--${tone === 'neutral' ? 'neutral' : severity}`, elevated && 'atlas-feedback--elevated']"
    data-testid="atlas-feedback"
  >
    <div class="atlas-feedback__rail">
      <AtlasIcon color="white" size="20">{{ resolvedIcon }}</AtlasIcon>
    </div>
    <div class="atlas-feedback__inner">
      <div class="atlas-feedback__body">
        <div v-if="title" :class="['atlas-feedback__title', tone === 'neutral' && 'atlas-feedback__title--note']">
          <span>{{ title }}</span>
          <span v-if="count !== undefined" class="atlas-feedback__count" data-testid="atlas-feedback-count">{{ count }}</span>
        </div>
        <div v-if="$slots.default" class="atlas-feedback__message"><slot /></div>
        <div v-if="$slots.details" class="atlas-feedback__details"><slot name="details" /></div>
        <div v-if="$slots.actions" class="atlas-feedback__actions"><slot name="actions" /></div>
      </div>
      <slot name="append" />
      <button
        v-if="closable"
        type="button"
        class="atlas-feedback__close"
        :aria-label="closeLabel"
        data-testid="atlas-feedback-close"
        @click="$emit('close')"
      >
        <AtlasIcon size="18">mdi-close</AtlasIcon>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AtlasIcon from './AtlasIcon.vue'

export type AtlasFeedbackSeverity = 'info' | 'success' | 'warning' | 'danger'

interface Props {
  severity?: AtlasFeedbackSeverity
  tone?: 'severity' | 'neutral'
  title?: string
  count?: number
  closable?: boolean
  elevated?: boolean
  prependIcon?: string
  closeLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  severity: 'info',
  tone: 'severity',
  title: undefined,
  count: undefined,
  closable: false,
  elevated: false,
  prependIcon: undefined,
  closeLabel: 'Dismiss',
})

defineEmits<{ close: [] }>()

const SEVERITY_ICON: Record<AtlasFeedbackSeverity, string> = {
  info: 'mdi-information',
  success: 'mdi-check-circle',
  warning: 'mdi-alert',
  danger: 'mdi-alert-circle',
}

const resolvedIcon = computed(() => {
  if (props.prependIcon) return props.prependIcon
  if (props.tone === 'neutral') return 'mdi-information'
  return SEVERITY_ICON[props.severity]
})
</script>

<style scoped>
.atlas-feedback {
  display: flex;
  align-items: stretch;
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: var(--atlas-radius-lg);
  overflow: hidden;
}
.atlas-feedback--elevated {
  border: none;
  box-shadow: var(--atlas-elevation-ambient), var(--atlas-elevation-diffuse);
}
.atlas-feedback__rail {
  width: 44px;
  flex: none;
  display: flex;
  justify-content: center;
  padding-top: 15px;
}
.atlas-feedback--info .atlas-feedback__rail    { background-color: rgb(var(--v-theme-info)); }
.atlas-feedback--success .atlas-feedback__rail { background-color: rgb(var(--v-theme-success)); }
.atlas-feedback--warning .atlas-feedback__rail { background-color: rgb(var(--v-theme-warning)); }
.atlas-feedback--danger .atlas-feedback__rail  { background-color: rgb(var(--v-theme-error)); }
.atlas-feedback--neutral .atlas-feedback__rail { background-color: rgb(var(--v-theme-primary)); }
.atlas-feedback__inner {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  flex: 1;
  min-width: 0;
}
.atlas-feedback__body { flex: 1; min-width: 0; }
.atlas-feedback__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  color: rgb(var(--v-theme-on-surface));
}
.atlas-feedback__title--note {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}
.atlas-feedback__message {
  font-size: 13px;
  line-height: 1.5;
  margin-top: 3px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.atlas-feedback__count {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 7px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 700;
}
.atlas-feedback--info .atlas-feedback__count    { background: rgba(var(--v-theme-info), .16); color: rgb(var(--v-theme-info)); }
.atlas-feedback--success .atlas-feedback__count { background: rgba(var(--v-theme-success), .16); color: rgb(var(--v-theme-success)); }
.atlas-feedback--warning .atlas-feedback__count { background: rgba(var(--v-theme-warning), .16); color: rgb(var(--v-theme-warning)); }
.atlas-feedback--danger .atlas-feedback__count  { background: rgba(var(--v-theme-error), .16); color: rgb(var(--v-theme-error)); }
.atlas-feedback__actions { display: flex; gap: 8px; margin-top: 12px; }
.atlas-feedback__details { margin-top: 10px; }
.atlas-feedback__close {
  width: 24px;
  height: 24px;
  flex: none;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  opacity: .7;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.atlas-feedback__close:hover { opacity: 1; background: rgba(var(--v-theme-on-surface), 0.06); }
</style>
