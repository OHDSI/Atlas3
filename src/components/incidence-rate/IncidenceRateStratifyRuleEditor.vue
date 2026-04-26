<template>
  <div class="rule-editor">
    <v-text-field
      :model-value="rule.name"
      :label="t('incidenceRate.stratifyName', 'Rule name').value"
      density="compact"
      hide-details
      class="mb-2"
      @update:model-value="(v: string) => emit('update', { name: v })"
    />
    <v-text-field
      :model-value="rule.description ?? ''"
      :label="t('incidenceRate.stratifyDescription', 'Description').value"
      density="compact"
      hide-details
      class="mb-3"
      @update:model-value="(v: string) => emit('update', { description: v })"
    />
    <CriteriaGroupEditor
      :model-value="(rule.expression as CriteriaGroup) ?? defaultGroup"
      @update:model-value="(g: CriteriaGroup) => emit('update', { expression: g })"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useI18n } from '@/composables/useI18n'
import CriteriaGroupEditor from '@/components/cohort-builder/CriteriaGroupEditor.vue'
import type { CriteriaGroup } from '@/models/cohort.types'
import type { StratifyRule } from '@/models/incidence-rate.types'

const { rule } = defineProps<{ rule: StratifyRule }>()
const emit = defineEmits<{ (e: 'update', partial: Partial<StratifyRule>): void }>()
const { t } = useI18n()

const defaultGroup = computed<CriteriaGroup>(() => ({
  id: uuidv4(),
  logicType: 'ALL',
  events: [],
}))
</script>

<style scoped>
.rule-editor { padding: 8px 12px; }
</style>
