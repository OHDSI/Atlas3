<template>
  <div class="dsrr-actions">
    <AtlasTooltip
      v-if="effectiveDisabled && disabledReason"
      location="top"
    >
      <template #activator="{ props: tipProps }">
        <span
          v-bind="tipProps"
          class="dsrr-tip-wrap"
        >
          <AtlasButton
            :variant="primaryVariant"
            size="sm"
            :disabled="true"
            :data-testid="`run-btn-${sourceKey}`"
          >
            {{ primaryLabel }}
          </AtlasButton>
        </span>
      </template>
      <span>{{ disabledReason }}</span>
    </AtlasTooltip>
    <AtlasButton
      v-else
      :variant="primaryVariant"
      size="sm"
      :disabled="effectiveDisabled"
      :data-testid="`run-btn-${sourceKey}`"
      @click="onPrimaryClick"
    >
      {{ primaryLabel }}
    </AtlasButton>

    <AtlasTooltip
      v-if="canViewLatestResult"
      location="top"
    >
      <template #activator="{ props: tipProps }">
        <span v-bind="tipProps">
          <AtlasIconButton
            :icon="latestResultIcon"
            v-bind="{ ariaLabel: viewLatestLabel }"
            variant="text"
            size="sm"
            :tone="isActiveLatestResult ? 'primary' : 'neutral'"
            :data-testid="`view-latest-btn-${sourceKey}`"
            @click="$emit('select-result')"
          />
        </span>
      </template>
      <span>{{ viewLatestLabel }}</span>
    </AtlasTooltip>

    <AtlasIconButton
      v-if="!hideHistoryButton"
      icon="mdi-history"
      v-bind="{ ariaLabel: historyLabel }"
      variant="text"
      size="sm"
      tone="neutral"
      :disabled="historyDisabled"
      :data-testid="`history-btn-${sourceKey}`"
      @click="$emit('show-history')"
    />
    <span
      v-if="!hideHistoryButton && historyCount > 1"
      class="dsrr-count"
      :data-testid="`history-count-${sourceKey}`"
    >{{ historyCount }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasButton, AtlasIconButton, AtlasTooltip } from '@/components/ui'
import { useSourceAccess } from '@/composables/useEntityAccess'
import { useI18n } from '@/composables/useI18n'
import type { GenerationStatus } from '@/models/characterization.types'

interface Props {
  sourceId: number
  sourceKey: string
  latestStatus?: GenerationStatus
  latestExecutionId?: number | string | null
  selectedExecutionId?: number | string | null
  historyCount: number
  runDisabled?: boolean
  runDisabledReason?: string
  hideCancel?: boolean
  hideHistoryButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  latestStatus: undefined,
  latestExecutionId: null,
  selectedExecutionId: null,
  runDisabled: false,
  runDisabledReason: '',
  hideCancel: false,
  hideHistoryButton: false,
})

const emit = defineEmits<{
  run: []
  cancel: []
  'select-result': []
  'show-history': []
}>()

const { t, tv } = useI18n()
const { canWrite } = useSourceAccess(computed(() => props.sourceId))

const isActive = computed(() =>
  props.latestStatus === 'PENDING' ||
  props.latestStatus === 'STARTING' ||
  props.latestStatus === 'STARTED' ||
  props.latestStatus === 'RUNNING'
)
const isStopping = computed(() => props.latestStatus === 'STOPPING')
const isActiveLatestResult = computed(() =>
  props.selectedExecutionId != null &&
  props.latestExecutionId != null &&
  String(props.selectedExecutionId) === String(props.latestExecutionId)
)
const canViewLatestResult = computed(() => props.latestStatus === 'COMPLETED' && props.latestExecutionId != null)
const latestResultIcon = computed(() => (isActiveLatestResult.value ? 'mdi-eye' : 'mdi-eye-outline'))

const primaryLabel = computed(() => {
  if (isStopping.value) {
    return t('components.analysisExecution.buttons.stopping', 'Stopping…').value
  }
  if (isActive.value && !props.hideCancel) {
    return t('components.analysisExecution.buttons.cancel', 'Cancel').value
  }
  if (!props.latestStatus) {
    return t('components.analysisExecution.buttons.generate', 'Generate').value
  }
  return t('components.analysisExecution.buttons.rerun', 'Rerun').value
})

const primaryVariant = computed<'primary' | 'danger'>(() =>
  isActive.value && !props.hideCancel ? 'danger' : 'primary'
)

const permissionMessage = tv(
  'components.analysisExecution.noWritePermission',
  'You do not have permission to run jobs against this source'
)

const effectiveDisabled = computed(() => {
  if (isStopping.value) return true
  if (props.runDisabled) return true
  if (!canWrite.value) return true
  if (isActive.value && props.hideCancel) return true
  return false
})

const disabledReason = computed(() => {
  if (isStopping.value) return ''
  if (props.runDisabled) return props.runDisabledReason || ''
  if (!canWrite.value) return permissionMessage
  return ''
})

const historyDisabled = computed(() => props.historyCount === 0)
const historyLabel = tv('components.analysisExecution.previousRuns', 'Previous runs')
const viewLatestLabel = tv('components.analysisExecution.viewResults', 'View results')

function onPrimaryClick() {
  if (effectiveDisabled.value) return
  if (isActive.value && !props.hideCancel) emit('cancel')
  else emit('run')
}
</script>

<style scoped>
.dsrr-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
  width: 100%;
}
.dsrr-tip-wrap {
  display: inline-flex;
}
.dsrr-count {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  min-width: 14px;
  text-align: center;
}
</style>
