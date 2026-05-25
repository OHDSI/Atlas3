<template>
  <div
    class="char-empty"
    data-testid="char-empty-state"
  >
    <div class="char-empty__icon">
      {{ icon }}
    </div>
    <h3 class="char-empty__title">
      {{ title }}
    </h3>
    <p
      v-if="hint"
      class="char-empty__hint"
    >
      {{ hint }}
    </p>
    <AtlasButton
      v-if="variant === 'no-runs'"
      data-testid="char-empty-run"
      @click="$emit('run')"
    >
      {{ runLabel }}
    </AtlasButton>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasButton } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'

type Variant = 'no-id' | 'no-runs' | 'run-pending' | 'run-failed' | 'no-data'

const props = defineProps<{ variant: Variant; errorMessage?: string }>()
defineEmits<{ run: [] }>()

const { tv } = useI18n()

const icon = computed(() => ({
  'no-id': '', 'no-runs': '', 'run-pending': '',
  'run-failed': '', 'no-data': '',
} as const)[props.variant])

const title = computed(() => ({
  'no-id': tv('cc.viewEdit.workbench.empty.noIdTitle', 'Save the design to enable runs'),
  'no-runs': tv('cc.viewEdit.workbench.empty.noRunsTitle', 'No runs yet'),
  'run-pending': tv('cc.viewEdit.workbench.empty.runPendingTitle', 'Run in progress'),
  'run-failed': tv('cc.viewEdit.workbench.empty.runFailedTitle', 'Run failed'),
  'no-data': tv('cc.viewEdit.workbench.empty.noDataTitle', 'No rows match the current filter'),
})[props.variant])

const hint = computed(() => {
  if (props.variant === 'run-failed') return props.errorMessage ?? ''
  if (props.variant === 'run-pending') {
    return tv('cc.viewEdit.workbench.empty.runPendingHint', 'Polling for completion…')
  }
  if (props.variant === 'no-runs') {
    return tv('cc.viewEdit.workbench.empty.noRunsHint', 'Generate against a data source to see baseline characteristics.')
  }
  return ''
})

const runLabel = computed(() =>
  tv('cohortDefinitions.cohort.modals.configureReportsToRun.run', 'Run')
)
</script>

<style scoped>
.char-empty {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  background: rgb(var(--v-theme-surface));
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 8px;
  padding: 32px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  gap: 8px;
  min-height: 320px;
}
.char-empty__icon { font-size: 42px; opacity: 0.7; line-height: 1; }
.char-empty__title { margin: 0; color: rgb(var(--v-theme-on-surface)); font-weight: 500; font-size: 16px; }
.char-empty__hint { margin: 0 0 8px; max-width: 360px; font-size: 13px; }
</style>
