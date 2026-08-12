<template>
  <div class="inclusion-rules-panel">
    <div
      v-if="modelValue.length === 0"
      class="inclusion-rules-panel__empty"
    >
      <AtlasIcon
        icon="mdi-filter-variant-plus"
        class="inclusion-rules-panel__empty-icon"
      />
      <span class="inclusion-rules-panel__empty-text">
        {{
          t(
            'components.cohortExpressionEditor.inclusionCriteriaTextShort',
            'No inclusion rules — adding one narrows which patients qualify beyond the entry events.'
          ).value
        }}
      </span>
      <AtlasButton
        variant="primary"
        size="sm"
        icon="mdi-plus"
        class="inclusion-rules-panel__empty-add"
        data-testid="inclusion-empty-add"
        @click="addNewRule"
      >
        {{ t('inclusionRail.add', 'Add inclusion rule').value }}
      </AtlasButton>
    </div>

    <template v-else>
      <div class="inclusion-rules-panel__layout">
        <div class="inclusion-rules-panel__rail">
          <InclusionRuleRail
            :rules="modelValue"
            :selected-index="selectedIndex"
            @select="onSelect"
            @add-rule="addNewRule"
            @reorder="onReorder"
          />
        </div>

        <div class="inclusion-rules-panel__detail">
          <InclusionRuleDetail
            :rule="activeRule"
            :concept-sets="conceptSets"
            @remove="removeSelectedRule"
            @select-concept-set="forwardConceptSetSelection"
            @edit-concept-set="forwardConceptSetEdit"
            @clear-concept-set="forwardConceptSetClear"
          />
        </div>
      </div>

      <div class="inclusion-rules-panel__limit">
        <div class="inclusion-rules-panel__limit-label">
          {{ limitIncludedEventsLabel }}
        </div>
        <div class="inclusion-rules-panel__limit-toggle">
          <AtlasButton
            :variant="expressionLimitType === 'First' ? 'tonal' : 'secondary'"
            size="sm"
            @click="expressionLimitType = 'First'"
          >
            {{ earliestLabel }}
          </AtlasButton>
          <AtlasButton
            :variant="expressionLimitType === 'All' ? 'tonal' : 'secondary'"
            size="sm"
            @click="expressionLimitType = 'All'"
          >
            {{ allLabel }}
          </AtlasButton>
          <AtlasButton
            :variant="expressionLimitType === 'Last' ? 'tonal' : 'secondary'"
            size="sm"
            @click="expressionLimitType = 'Last'"
          >
            {{ latestLabel }}
          </AtlasButton>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AtlasButton, AtlasIcon } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { CriteriaGroup, InclusionRule, ResultLimit } from '../circe.types'
import type { ConceptSetOption, ConceptSetSelectionTarget } from '../criteria/criteria-editor.types'
import InclusionRuleRail from './InclusionRuleRail.vue'
import InclusionRuleDetail from './InclusionRuleDetail.vue'

const { t } = useI18n()

type LimitType = 'First' | 'All' | 'Last'

interface Props {
  modelValue: InclusionRule[]
  conceptSets: ConceptSetOption[]
  expressionLimit?: ResultLimit | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: InclusionRule[]]
  'update:expressionLimit': [value: ResultLimit]
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()

const limitIncludedEventsLabel = computed(() => t('inclusionPanel.limitIncludedEvents', 'Limit Included Events to').value)
const earliestLabel = computed(() => t('options.earliest', 'Earliest').value)
const allLabel = computed(() => t('options.all', 'All').value)
const latestLabel = computed(() => t('options.latest', 'Latest').value)

const expressionLimitType = computed<LimitType>({
  get: () => props.expressionLimit?.Type ?? 'All',
  set: value => emit('update:expressionLimit', { Type: value }),
})

const selectedIndex = ref<number | null>(props.modelValue.length > 0 ? 0 : null)

const activeRule = computed(() => {
  if (selectedIndex.value === null) {
    return null
  }

  return props.modelValue[selectedIndex.value] ?? null
})

watch(
  () => props.modelValue.length,
  length => {
    if (length === 0) {
      selectedIndex.value = null
      return
    }

    if (selectedIndex.value === null) {
      selectedIndex.value = 0
      return
    }

    if (selectedIndex.value >= length) {
      selectedIndex.value = length - 1
    }
  }
)

function onSelect(index: number) {
  selectedIndex.value = index
}

function addNewRule() {
  const newRule = createDefaultRule()

  const updated = [...props.modelValue, newRule]
  emit('update:modelValue', updated)
  selectedIndex.value = updated.length - 1
}

function removeRule(index: number) {
  const updated = [...props.modelValue]
  updated.splice(index, 1)
  emit('update:modelValue', updated)

  if (updated.length === 0) {
    selectedIndex.value = null
  } else if (selectedIndex.value !== null && selectedIndex.value >= updated.length) {
    selectedIndex.value = updated.length - 1
  }
}

function removeSelectedRule() {
  if (selectedIndex.value === null) {
    return
  }

  removeRule(selectedIndex.value)
}

function forwardConceptSetSelection(target: ConceptSetSelectionTarget | undefined) {
  emit('select-concept-set', target)
}

function forwardConceptSetEdit(target: ConceptSetSelectionTarget | undefined) {
  emit('edit-concept-set', target)
}

function forwardConceptSetClear() {
  emit('clear-concept-set')
}

function onReorder({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }) {
  const updated = [...props.modelValue]
  const [moved] = updated.splice(fromIndex, 1)
  if (!moved) return

  updated.splice(toIndex, 0, moved)

  if (selectedIndex.value === fromIndex) {
    selectedIndex.value = toIndex
  } else if (selectedIndex.value !== null) {
    if (fromIndex < selectedIndex.value && toIndex >= selectedIndex.value) {
      selectedIndex.value -= 1
    } else if (fromIndex > selectedIndex.value && toIndex <= selectedIndex.value) {
      selectedIndex.value += 1
    }
  }

  emit('update:modelValue', updated)
}

function createDefaultRule(): InclusionRule {
  return {
    name: undefined,
    description: undefined,
    expression: createDefaultCriteriaGroup(),
  }
}

function createDefaultCriteriaGroup(): CriteriaGroup {
  return {
    Type: 'ALL',
    CriteriaList: [],
    DemographicCriteriaList: [],
    Groups: [],
  }
}
</script>

<style scoped>
.inclusion-rules-panel {
  display: block;
}

.inclusion-rules-panel__empty {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface-variant));
}

.inclusion-rules-panel__empty-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
  flex-shrink: 0;
}

.inclusion-rules-panel__empty-text {
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.5;
  flex: 1;
}

.inclusion-rules-panel__empty-add {
  flex-shrink: 0;
  margin-left: auto;
}

.inclusion-rules-panel__layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 12px;
}

@media (max-width: 1023px) {
  .inclusion-rules-panel__layout {
    grid-template-columns: 1fr;
  }
}

.inclusion-rules-panel__detail {
  min-width: 0;
}

.inclusion-rules-panel__limit {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 12px;
}

.inclusion-rules-panel__limit-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-on-surface-variant));
}

.inclusion-rules-panel__limit :deep(.v-btn-toggle) {
  border-radius: 999px;
  overflow: hidden;
}

.inclusion-rules-panel__limit :deep(.v-btn-toggle > .v-btn) {
  min-width: 0;
  border-radius: 0 !important;
  min-height: 28px;
  padding-inline: 10px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}

.inclusion-rules-panel__limit :deep(.v-btn-toggle > .v-btn:first-child) {
  border-top-left-radius: 999px !important;
  border-bottom-left-radius: 999px !important;
}

.inclusion-rules-panel__limit :deep(.v-btn-toggle > .v-btn:last-child) {
  border-top-right-radius: 999px !important;
  border-bottom-right-radius: 999px !important;
}
</style>
