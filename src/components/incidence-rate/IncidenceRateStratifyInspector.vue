<template>
  <AtlasDialog
    v-if="rule"
    :model-value="modelValue"
    :eyebrow="t('navigation.incidenceRates', 'Incidence rate').value"
    :title="rule.name || t('incidenceRate.untitled', 'Untitled rule').value"
    :close-label="t('common.close', 'Close').value"
    max-width="900"
    @update:model-value="(v: boolean) => $emit('update:modelValue', v)"
  >
    <IncidenceRateStratifyRuleEditor
      :rule="rule"
      @update="(p: Partial<StratifyRule>) => $emit('update', p)"
    />
  </AtlasDialog>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { AtlasDialog } from '@/components/ui'
import IncidenceRateStratifyRuleEditor from '@/components/incidence-rate/IncidenceRateStratifyRuleEditor.vue'
import type { StratifyRule } from '@/models/incidence-rate.types'

defineProps<{ modelValue: boolean; rule: StratifyRule | null }>()
defineEmits<{
  'update:modelValue': [v: boolean]
  update: [partial: Partial<StratifyRule>]
}>()
const { t } = useI18n()
</script>
