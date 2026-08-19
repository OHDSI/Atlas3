<template>
  <div
    class="event-concept-set-field"
    :class="{ 'event-concept-set-field--compact': props.compact }"
    data-testid="event-concept-set-field"
  >
    <div
      v-if="!props.compact"
      class="event-concept-set-field__title"
    >
      {{ titleLabel }}
    </div>
    <div class="event-concept-set-field__input">
      <AtlasButton
        v-if="!selectedConceptSet"
        variant="secondary"
        size="sm"
        :data-testid="props.pickerTestId"
        @click="emit('select', selectionTarget)"
      >
        <AtlasIcon
          start
          size="small"
        >
          mdi-plus
        </AtlasIcon>
        {{ selectLabel }}
      </AtlasButton>

      <AtlasChip
        v-else
        closable
        color="primary"
        variant="elevated"
        :data-testid="props.chipTestId"
        style="cursor: pointer"
        @click="emit('edit', selectionTarget)"
        @click:close="clearConceptSet"
      >
        {{ selectedConceptSet.name }}
      </AtlasChip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { AtlasButton, AtlasChip, AtlasIcon } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { ConceptSetOption, ConceptSetSelectionTarget } from '../criteria/criteria-editor.types'
import type { ConceptSetSelection } from '@/models/circe-types'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    conceptSets: ConceptSetOption[]
    modelValue?: ConceptSetSelection
    label?: string
    selectLabel?: string
    compact?: boolean
    pickerTestId?: string
    chipTestId?: string
  }>(),
  {
    modelValue: undefined,
    label: undefined,
    selectLabel: undefined,
    compact: false,
    pickerTestId: 'concept-set-picker',
    chipTestId: 'selected-concept-set',
  }
)

const titleLabel = computed(() => props.label ?? t('common.conceptSet', 'Concept Set').value)
const selectLabel = computed(() =>
  props.selectLabel ?? t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value
)

const selectionTarget = computed<ConceptSetSelectionTarget | undefined>(() => {
  if (!props.modelValue) {
    return undefined
  }

  return { targetRef: toRef(props.modelValue, 'CodesetId') }
})

const selectedConceptSet = computed(() => {
  const selectedId = props.modelValue?.CodesetId
  if (selectedId === undefined || selectedId === null) {
    return undefined
  }

  return props.conceptSets.find(conceptSet => conceptSet.id === selectedId)
})

const emit = defineEmits<{
  select: [target: ConceptSetSelectionTarget | undefined]
  clear: []
  edit: [target: ConceptSetSelectionTarget | undefined]
}>()

function clearConceptSet() {
  if (selectionTarget.value) {
    selectionTarget.value.targetRef.value = undefined
  }

  emit('clear')
}
</script>

<style scoped>
.event-concept-set-field {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 6px;
  border: 1px solid rgb(var(--v-theme-primary));
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.event-concept-set-field__title {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  flex: 0 0 auto;
  min-width: 140px;
  color: rgb(var(--v-theme-primary));
  background: #ebf2fa;
  font-size: 13px;
  font-weight: 500;
  border-right: 1px solid rgb(var(--v-theme-primary));
}

.event-concept-set-field__input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  flex: 1 1 auto;
  color: rgb(var(--v-theme-primary));
}

.event-concept-set-field--compact {
  border: none;
  background: transparent;
  border-radius: 0;
}

.event-concept-set-field--compact .event-concept-set-field__input {
  padding: 0;
}
</style>