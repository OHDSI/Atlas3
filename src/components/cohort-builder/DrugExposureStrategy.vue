<template>
  <div class="drug-exposure-strategy">
    <!-- Strategy-specific help text -->
    <div class="strategy-hint">
      <AtlasIcon
        icon="mdi-information-outline"
        size="16"
        class="strategy-hint-icon"
      />
      <span>{{
        tv(
          'components.customEraStrategy.customEraStrategyText_2',
          'Event persists based on continuous drug exposure with allowable gaps between exposures'
        )
      }}</span>
    </div>

    <!-- Concept Set Selection Button/Chip -->
    <div class="mt-4 mb-4">
      <AtlasButton
        v-if="!strategy.conceptSet || strategy.conceptSet.id == null"
        variant="secondary"
        icon="mdi-plus"
        :disabled="disabled"
        @click="$emit('select-drug-concept-set')"
      >
        {{ tv('components.customEraStrategy.selectDrugConceptSet', 'Select Drug Concept Set') }}
      </AtlasButton>
      <AtlasChip
        v-else
        :closable="!disabled"
        tone="primary"
        style="cursor: pointer"
        @click="$emit('edit-drug-concept-set', strategy.conceptSet)"
        @close="clearConceptSet"
      >
        {{ strategy.conceptSet.name }}
      </AtlasChip>
    </div>

    <!-- Persistence Window and Surveillance Window -->
    <template v-if="strategy.conceptSet && strategy.conceptSet.id != null">
      <AtlasRow>
        <AtlasCol cols="6">
          <AtlasTextField
            v-model.number="strategy.persistenceWindow"
            :label="
              tv(
                'components.customEraStrategy.customEraStrategyText_4',
                'Persistence Window (days)'
              )
            "
            :disabled="disabled"
            :rules="[nonNegativeRule]"
            variant="outlined"
          >
            <template #append-inner>
              <AtlasTooltip location="top">
                <template #activator="{ props: tooltipProps }">
                  <AtlasIcon
                    v-bind="tooltipProps"
                    icon="mdi-information-outline"
                    size="small"
                    class="text-medium-emphasis"
                  />
                </template>
                <span>{{
                  tv(
                    'components.customEraStrategy.customEraStrategyText_5',
                    'Maximum gap days between exposures'
                  )
                }}</span>
              </AtlasTooltip>
            </template>
          </AtlasTextField>
        </AtlasCol>
        <AtlasCol cols="6">
          <AtlasTextField
            v-model.number="strategy.surveillanceWindow"
            :label="
              tv(
                'components.customEraStrategy.customEraStrategyText_6',
                'Surveillance Window (days)'
              )
            "
            :disabled="disabled"
            :rules="[nonNegativeRule]"
            variant="outlined"
          >
            <template #append-inner>
              <AtlasTooltip location="top">
                <template #activator="{ props: tooltipProps }">
                  <AtlasIcon
                    v-bind="tooltipProps"
                    icon="mdi-information-outline"
                    size="small"
                    class="text-medium-emphasis"
                  />
                </template>
                <span>{{
                  tv(
                    'components.customEraStrategy.customEraStrategyText_7',
                    'Additional days after final exposure before cohort exit'
                  )
                }}</span>
              </AtlasTooltip>
            </template>
          </AtlasTextField>
        </AtlasCol>
      </AtlasRow>

      <!-- Help text about missing days supply -->
      <div class="strategy-hint strategy-hint--mt">
        <AtlasIcon
          icon="mdi-information-outline"
          size="16"
          class="strategy-hint-icon"
        />
        <span>{{
          tv(
            'exitCriteria.help.missingDaysSupply',
            'If days supply is missing, system assumes 1 day per exposure'
          )
        }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  AtlasButton,
  AtlasChip,
  AtlasIcon,
  AtlasRow,
  AtlasCol,
  AtlasTextField,
  AtlasTooltip,
} from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { ExitCriteria } from '@/models/cohort.types'

const { tv } = useI18n()

interface Props {
  strategy: ExitCriteria
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

defineEmits<{
  'select-drug-concept-set': []
  'edit-drug-concept-set': [conceptSet: { id: number | string; name: string; items?: unknown[] }]
}>()

// Validation rules
const nonNegativeRule = (value: number) => {
  if (value < 0) {
    return tv('exitCriteria.validation.offsetNonNegative', 'Offset values must be non-negative')
  }
  return true
}

// Clear selected concept set
function clearConceptSet() {
  if (props.strategy.conceptSet) {
    props.strategy.conceptSet = undefined
  }
}
</script>

<style scoped>
.drug-exposure-strategy {
  padding: 12px 16px;
}

.strategy-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.5;
}

.strategy-hint--mt {
  margin-top: 8px;
  margin-bottom: 0;
}

.strategy-hint-icon {
  color: rgb(var(--v-theme-primary));
  opacity: 0.7;
  flex-shrink: 0;
  margin-top: 2px;
}

.mt-4 {
  margin-top: 16px;
}

.mb-4 {
  margin-bottom: 16px;
}
</style>
