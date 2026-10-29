<template>
  <div class="custom-era-end-strategy">
    <div class="strategy-hint">
      <AtlasIcon
        size="16"
        class="strategy-hint__icon"
      >
        mdi-information-outline
      </AtlasIcon>
      <span>{{ tv('components.endStrategy.customEra.hint') }}</span>
    </div>

    <div class="custom-era-end-strategy__concept-set mt-4">
      <AtlasButton
        v-if="drugConceptSet === undefined"
        variant="secondary"
        size="sm"
        prepend-icon="mdi-plus"
        @click="emit('select-concept-set', selectionTarget)"
      >
        {{ tv('components.endStrategy.customEra.selectConceptSet') }}
      </AtlasButton>

      <AtlasChip
        v-else
        closable
        color="primary"
        variant="elevated"
        style="cursor: pointer"
        @click="emit('edit-concept-set', selectionTarget)"
        @click:close="clearConceptSet"
      >
        {{ drugConceptSet.name }}
      </AtlasChip>
    </div>

    <template v-if="drugConceptSet !== undefined">
      <div class="custom-era-end-strategy__fields mt-4">
        <AtlasTextField
          v-model.number="gapDays"
          type="number"
          :label="tv('components.endStrategy.customEra.persistenceWindow')"
          :hint="tv('components.endStrategy.customEra.persistenceWindowHint')"
          persistent-hint
          variant="outlined"
          density="compact"
          min="0"
        />

        <AtlasTextField
          v-model.number="offset"
          type="number"
          :label="tv('components.endStrategy.customEra.surveillanceWindow')"
          :hint="tv('components.endStrategy.customEra.surveillanceWindowHint')"
          persistent-hint
          variant="outlined"
          density="compact"
          min="0"
        />
      </div>

      <div
        v-if="!overrideEnabled"
        class="strategy-hint strategy-hint--secondary mt-3"
      >
        <AtlasIcon
          size="16"
          class="strategy-hint__icon"
        >
          mdi-information-outline
        </AtlasIcon>
        <span>{{ tv('components.endStrategy.customEra.daysSupplyHint') }}</span>
      </div>

      <div class="custom-era-end-strategy__override mt-4">
        <template v-if="overrideEnabled">
          <AtlasTextField
            v-model.number="daysSupplyOverride"
            type="number"
            :label="tv('components.endStrategy.customEra.daysSupplyOverride')"
            variant="outlined"
            density="compact"
            hide-details
            min="0"
          />
          <AtlasIconButton
            icon="mdi-close"
            tone="danger"
            variant="text"
            size="sm"
            :aria-label="tv('components.endStrategy.customEra.removeDaysSupplyOverride')"
            @click="overrideEnabled = false"
          />
        </template>
        <AtlasChip
          v-else
          color="primary"
          variant="outlined"
          style="cursor: pointer"
          @click="overrideEnabled = true"
        >
          {{ tv('components.endStrategy.customEra.overrideDaysSupply') }}
        </AtlasChip>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import {
  AtlasButton,
  AtlasChip,
  AtlasIconButton,
  AtlasIcon,
  AtlasTextField,
} from '@/components/ui'
import type { CustomEraStrategy } from '@/models/circe-types'
import type { ConceptSetOption, ConceptSetSelectionTarget } from '@/components/circe/criteria/criteria-editor.types'
import { useI18n } from '@/composables/useI18n'

const { tv } = useI18n()

const props = defineProps<{
  strategy: CustomEraStrategy
  conceptSets: ConceptSetOption[]
}>()

const emit = defineEmits<{
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()

// Direct ref into strategy.DrugCodesetId — same pattern as EventConceptSet.vue
const selectionTarget: ConceptSetSelectionTarget = {
  targetRef: toRef(props.strategy, 'DrugCodesetId'),
}

const drugConceptSet = computed(() =>
  props.strategy.DrugCodesetId !== undefined
    ? props.conceptSets.find(cs => cs.id === props.strategy.DrugCodesetId)
    : undefined
)

const gapDays = computed<number>({
  get: () => props.strategy.GapDays ?? 0,
  set: value => {
    props.strategy.GapDays = Number(value) || 0
  },
})

const offset = computed<number>({
  get: () => props.strategy.Offset ?? 0,
  set: value => {
    props.strategy.Offset = Number(value) || 0
  },
})

const overrideEnabled = computed<boolean>({
  get: () => props.strategy.DaysSupplyOverride != null,
  set: enabled => {
    props.strategy.DaysSupplyOverride = enabled ? 1 : undefined
  },
})

const daysSupplyOverride = computed<number>({
  get: () => props.strategy.DaysSupplyOverride ?? 1,
  set: value => {
    props.strategy.DaysSupplyOverride = Number(value) || 0
  },
})

function clearConceptSet() {
  props.strategy.DrugCodesetId = undefined
  emit('clear-concept-set')
}
</script>

<style scoped>
.custom-era-end-strategy {
  padding: 14px 0 6px;
}

.strategy-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.5;
}

.strategy-hint--secondary {
  margin-top: 4px;
}

.strategy-hint__icon {
  color: rgb(var(--v-theme-primary));
  opacity: 0.7;
  flex-shrink: 0;
  margin-top: 2px;
}

.custom-era-end-strategy__fields {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.custom-era-end-strategy__fields .v-text-field {
  max-width: 260px;
}

.custom-era-end-strategy__override {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.custom-era-end-strategy__override .v-text-field {
  max-width: 220px;
}
</style>
