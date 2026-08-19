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
      :concept-sets="conceptSets"
      @update="(p: Partial<StratifyRule>) => $emit('update', p)"
      @add-concept-set="(cs) => $emit('add-concept-set', cs)"
    />
  </AtlasDialog>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { AtlasDialog } from '@/components/ui'
import IncidenceRateStratifyRuleEditor from '@/components/incidence-rate/IncidenceRateStratifyRuleEditor.vue'
import type { StratifyRule } from '@/models/incidence-rate.types'
import type { ConceptSet } from '@/models/circe-types'

defineProps<{
  modelValue: boolean
  rule: StratifyRule | null
  conceptSets: ConceptSet[]
}>()
defineEmits<{
  'update:modelValue': [v: boolean]
  update: [partial: Partial<StratifyRule>]
  'add-concept-set': [cs: ConceptSet]
}>()
const { t } = useI18n()
</script>
