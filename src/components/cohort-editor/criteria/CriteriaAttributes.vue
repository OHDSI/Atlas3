<template>
  <div class="criteria-attributes-editor">
    <template
      v-for="row in attributes"
      :key="row.key"
    >
      <div
        v-if="row.kind === 'criteriaGroup'"
        class="attribute-container attribute-container--group mb-2"
      >
        <component
          :is="componentFor(row.kind)"
          v-bind="row.componentProps ? row.componentProps() : {}"
          class="attribute-group-editor"
          :concept-sets="conceptSets"
          @remove="removeRow(row.key)"
          @select-concept-set="emit('select-concept-set', $event)"
          @edit-concept-set="emit('edit-concept-set', $event)"
          @clear-concept-set="emit('clear-concept-set')"
        />
      </div>

      <div
        v-else
        class="attribute-container mb-2"
        :class="{ 'attribute-container--label-only': !row.kind }"
      >
        <div class="attribute-title">
          <span>{{ row.label }}</span>
          <AtlasTooltip
            v-if="row.description"
            location="top"
            max-width="320"
          >
            <template #activator="{ props: tooltipProps }">
              <AtlasIcon
                v-bind="tooltipProps"
                icon="mdi-help-circle-outline"
                size="14"
                class="attribute-title__help"
              />
            </template>
            <span>{{ row.description }}</span>
          </AtlasTooltip>
        </div>

        <div
          v-if="row.kind"
          class="attribute-input"
        >
          <component
            :is="componentFor(row.kind)"
            v-bind="row.componentProps ? row.componentProps() : {}"
          />
        </div>

        <div class="attribute-actions">
          <AtlasButton
            icon="mdi-delete"
            variant="ghost"
            color="error"
            size="sm"
            @click="removeRow(row.key)"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { markRaw } from 'vue'
import { AtlasButton, AtlasIcon, AtlasTooltip } from '@/components/ui'
import ConceptArray from '../input/ConceptArray.vue'
import DateAdjustment from '../input/DateAdjustment.vue'
import DateRange from '../input/DateRange.vue'
import NumericRange from '../input/NumericRange.vue'
import ConceptSetSelection from '../input/ConceptSetSelection.vue'
import CriteriaGroup from './CriteriaGroup.vue'
import PeriodEditor from '../input/Period.vue'
import TextFilter from '../input/TextFilter.vue'
import type { ConceptSetOption, ConceptSetSelectionTarget } from './criteria-editor.types'
import type { CriteriaAttributeSpec, CriteriaFieldKind } from './criteria-editor.types'

const { attributes, conceptSets } = defineProps<{
  attributes: CriteriaAttributeSpec[]
  conceptSets: ConceptSetOption[]
}>()

const emit = defineEmits<{
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()

const componentsByKind = {
  numericRange: markRaw(NumericRange),
  conceptSet: markRaw(ConceptSetSelection),
  conceptArray: markRaw(ConceptArray),
  dateRange: markRaw(DateRange),
  dateAdjustment: markRaw(DateAdjustment),
  textFilter: markRaw(TextFilter),
  period: markRaw(PeriodEditor),
  criteriaGroup: markRaw(CriteriaGroup),
} satisfies Record<CriteriaFieldKind, unknown>

function componentFor(kind: CriteriaFieldKind) {
  return componentsByKind[kind]
}

function removeRow(rowKey: string) {
  const row = attributes.find(spec => spec.key === rowKey)
  row?.clear()
}
</script>

<style scoped>
.criteria-attributes-editor {
  display: flex;
  flex-direction: column;
  margin-top: 8px;
}

.attribute-container {
  display: flex;
  border-radius: 6px;
  border: 1px solid rgb(var(--v-theme-primary));
  overflow: hidden;
}

.attribute-container--group {
  display: block;
  border: none;
  overflow: visible;
}

.attribute-group-editor {
  width: 100%;
}

.attribute-container--label-only .attribute-title {
  max-width: none;
  flex: 1 1 auto;
}

.attribute-container--label-only .attribute-actions {
  flex: 0 0 auto;
}

.attribute-container--label-only .attribute-input {
  display: none;
}

.attribute-title {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  flex: 1;
  max-width: 28%;
  color: rgb(var(--v-theme-primary));
  background: #ebf2fa;
  font-size: 13px;
  font-weight: 500;
  border-right: 1px solid rgb(var(--v-theme-primary));
}

.attribute-title__help {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.6;
  cursor: help;
}

.attribute-title__help:hover {
  opacity: 1;
}

.attribute-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  flex: 2;
  border-right: 1px solid rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary));
}

.attribute-input :deep(.v-field) {
  font-size: 13px;
}

.attribute-input :deep(.v-field__input) {
  padding: 4px 8px;
  min-height: 32px;
}

.attribute-input :deep(.v-field__append-inner) {
  padding-top: 4px;
  padding-bottom: 4px;
}

.attribute-input :deep(.v-select__selection-text) {
  font-size: 13px;
}

.attribute-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ebf2fa;
  padding: 0 2px;
  flex: 0 0 34px;
}

.attribute-actions .v-btn {
  transition: all 0.2s ease;
}

.attribute-actions .v-btn:hover {
  background: #d8e6f5;
}
</style>
