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

    <AtlasIconButton
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
      v-if="historyCount > 1"
      class="dsrr-count"
      :data-testid="`history-count-${sourceKey}`"
    >{{ historyCount }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { AtlasButton, AtlasIconButton, AtlasTooltip } from '@/components/ui'
import { useSourceAccess } from '@/composables/useEntityAccess'
import { useI18n } from '@/composables/useI18n'
import type { GenerationStatus } from '@/models/characterization.types'

interface Props {
  sourceKey: string
  latestStatus?: GenerationStatus
  historyCount: number
  runDisabled?: boolean
  runDisabledReason?: string
}

const props = withDefaults(defineProps<Props>(), {
  latestStatus: undefined,
  runDisabled: false,
  runDisabledReason: '',
})

const emit = defineEmits<{
  run: []
  cancel: []
  'show-history': []
}>()

const { t, tv } = useI18n()
const { canWrite } = useSourceAccess(toRef(() => props.sourceKey))

const isActive = computed(() =>
  props.latestStatus === 'PENDING' ||
  props.latestStatus === 'STARTING' ||
  props.latestStatus === 'STARTED' ||
  props.latestStatus === 'RUNNING'
)
const isStopping = computed(() => props.latestStatus === 'STOPPING')

const primaryLabel = computed(() => {
  if (isStopping.value) {
    return t('components.analysisExecution.buttons.stopping', 'Stopping…').value
  }
  if (isActive.value) {
    return t('components.analysisExecution.buttons.cancel', 'Cancel').value
  }
  if (!props.latestStatus) {
    return t('components.analysisExecution.buttons.generate', 'Generate').value
  }
  return t('components.analysisExecution.buttons.rerun', 'Rerun').value
})

const primaryVariant = computed<'primary' | 'danger'>(() =>
  isActive.value ? 'danger' : 'primary'
)

const permissionMessage = tv(
  'components.analysisExecution.noWritePermission',
  'You do not have permission to run jobs against this source'
)

const effectiveDisabled = computed(() => {
  if (isStopping.value) return true
  if (props.runDisabled) return true
  if (!canWrite.value) return true
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

function onPrimaryClick() {
  if (effectiveDisabled.value) return
  if (isActive.value) emit('cancel')
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
