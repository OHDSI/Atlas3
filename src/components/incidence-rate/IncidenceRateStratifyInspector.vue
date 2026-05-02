<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900"
    scrollable
    @update:model-value="(v: boolean) => $emit('update:modelValue', v)"
  >
    <v-card v-if="rule">
      <AppDialogHeader
        :eyebrow="t('navigation.incidenceRates', 'Incidence rate').value"
        :title="rule.name || t('incidenceRate.untitled', 'Untitled rule').value"
        :show-close="true"
        :close-label="t('common.close', 'Close').value"
        @close="$emit('update:modelValue', false)"
      />
      <v-card-text class="pa-4">
        <IncidenceRateStratifyRuleEditor
          :rule="rule"
          @update="(p: Partial<StratifyRule>) => $emit('update', p)"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import AppDialogHeader from '@/components/shared/AppDialogHeader.vue'
import IncidenceRateStratifyRuleEditor from '@/components/incidence-rate/IncidenceRateStratifyRuleEditor.vue'
import type { StratifyRule } from '@/models/incidence-rate.types'

defineProps<{ modelValue: boolean; rule: StratifyRule | null }>()
defineEmits<{
  'update:modelValue': [v: boolean]
  update: [partial: Partial<StratifyRule>]
}>()
const { t } = useI18n()
</script>
