<template>
  <div
    ref="panelRoot"
    class="inclusion-criteria-panel"
  >
    <div
      v-if="modelValue.length === 0"
      class="inclusion-criteria-panel__empty"
    >
      <AtlasIcon
        icon="mdi-filter-variant-plus"
        size="20"
        class="inclusion-criteria-panel__empty-icon"
      />
      <span class="inclusion-criteria-panel__empty-text">
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
        class="inclusion-criteria-panel__empty-add"
        data-testid="inclusion-empty-add"
        @click="addNewRule"
      >
        {{ t('inclusionRail.add', 'Add inclusion rule').value }}
      </AtlasButton>
    </div>

    <div
      v-else
      class="inclusion-criteria-panel__layout"
    >
      <AtlasCard padding="sm">
        <AtlasTooltip
          v-if="statsError && isInvalidExpression"
          location="bottom"
          max-width="520"
        >
          <template #activator="{ props: tooltipProps }">
            <AtlasAlert
              v-bind="tooltipProps"
              severity="warning"
              density="compact"
              class="mb-2 inclusion-stats-error"
              data-testid="inclusion-stats-invalid-expression"
            >
              <strong>Inclusion rule incomplete.</strong>
              <AtlasIcon
                size="14"
                class="ml-1 inclusion-stats-error__hint"
              >
                mdi-information-outline
              </AtlasIcon>
              <AtlasIconButton
                :icon="errorCopied ? 'mdi-check' : 'mdi-content-copy'"
                size="sm"
                variant="text"
                class="ml-1 inclusion-stats-error__copy"
                data-testid="inclusion-stats-error-copy"
                v-bind="{ ariaLabel: t('common.copy', 'Copy error').value }"
                @click.stop="copyStatsError"
              />
            </AtlasAlert>
          </template>
          <div class="inclusion-stats-error__tooltip">
            {{ statsError }}
          </div>
        </AtlasTooltip>
        <AtlasTooltip
          v-else-if="statsError"
          location="bottom"
          max-width="520"
        >
          <template #activator="{ props: tooltipProps }">
            <AtlasAlert
              v-bind="tooltipProps"
              severity="danger"
              density="compact"
              class="mb-2 inclusion-stats-error"
            >
              <strong>Live preview failed.</strong>
              <AtlasIcon
                size="14"
                class="ml-1 inclusion-stats-error__hint"
              >
                mdi-information-outline
              </AtlasIcon>
              <AtlasIconButton
                :icon="errorCopied ? 'mdi-check' : 'mdi-content-copy'"
                size="sm"
                variant="text"
                class="ml-1 inclusion-stats-error__copy"
                data-testid="inclusion-stats-error-copy-danger"
                v-bind="{ ariaLabel: t('common.copy', 'Copy error').value }"
                @click.stop="copyStatsError"
              />
            </AtlasAlert>
          </template>
          <div class="inclusion-stats-error__tooltip">
            {{ statsError }}
          </div>
        </AtlasTooltip>
        <InclusionRuleRail
          :rules="modelValue"
          :selected-index="selectedIndex"
          :cache-state="cacheState"
          :entry-event-count="(statsError ? null : stats?.entryEventCount) ?? null"
          :total-dataset-count="stats?.totalPatientCount ?? null"
          :rule-counts="(statsError ? null : stats?.ruleCounts) ?? null"
          :final-count="(statsError ? null : stats?.finalCount) ?? null"
          :is-computing="isPending && !statsError"
          :computing-index="lastEditedIndex"
          @select="onSelect"
          @add-rule="addNewRule"
          @reorder="onReorder"
        />
      </AtlasCard>

      <AtlasCard
        padding="md"
        class="inclusion-criteria-panel__detail"
      >
        <div
          v-if="selectedIndex !== null"
          class="inclusion-criteria-panel__detail-head"
        >
          <span class="inclusion-criteria-panel__detail-name">{{ activeRule?.name }}</span>
          <div class="inclusion-criteria-panel__detail-actions">
            <AtlasIconButton
              icon="mdi-pencil-outline"
              v-bind="{ ariaLabel: t('common.edit', 'Edit').value }"
              variant="text"
              size="sm"
              @click="openEditDialog(selectedIndex)"
            />
            <AtlasIconButton
              icon="mdi-delete-outline"
              v-bind="{ ariaLabel: t('common.delete', 'Delete').value }"
              variant="text"
              tone="danger"
              size="sm"
              data-testid="remove-inclusion-rule"
              @click="removeRule(selectedIndex)"
            />
          </div>
        </div>

        <InclusionRuleDetail
          :rule="activeRule"
          @update:rule="onRuleUpdated"
          @select-concept-set="onSelectConceptSet"
          @select-concept="onSelectConcept"
          @edit-concept-set="$emit('edit-concept-set', $event)"
        />
      </AtlasCard>
    </div>

    <AtlasDialog
      v-model="showEditDialog"
      eyebrow="EDIT"
      :title="t('common.editName', 'Rename rule').value"
      max-width="500"
      @close="showEditDialog = false"
    >
      <AtlasTextField
        v-model="editingName"
        :label="t('cohortDefinitions.ruleName', 'Rule name').value"
        variant="outlined"
        density="compact"
        @keyup.enter="saveEditedName"
      />
      <template #actions>
        <AtlasButton
          variant="ghost"
          @click="showEditDialog = false"
        >
          {{ t('common.cancel', 'Cancel').value }}
        </AtlasButton>
        <AtlasButton @click="saveEditedName">
          {{ t('common.save', 'Save').value }}
        </AtlasButton>
      </template>
    </AtlasDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { AtlasAlert, AtlasButton, AtlasCard, AtlasDialog, AtlasIcon, AtlasIconButton, AtlasTextField, AtlasTooltip } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useTrexSQLCache } from '@/composables/useTrexSQLCache'
import { useInclusionStats } from '@/composables/useInclusionStats'
import type { CriteriaGroup, InclusionRule, QualifyingLimit } from '@/models/cohort.types'
import InclusionRuleRail from './InclusionRuleRail.vue'
import InclusionRuleDetail from './InclusionRuleDetail.vue'

const { t } = useI18n()

interface Props {
  modelValue: InclusionRule[]
  qualifyingLimit?: QualifyingLimit
  expression?: Record<string, unknown> | null
}

const props = withDefaults(defineProps<Props>(), {
  qualifyingLimit: 'ALL',
  expression: null,
})

const emit = defineEmits<{
  'update:modelValue': [value: InclusionRule[]]
  'update:qualifyingLimit': [value: QualifyingLimit]
  'select-concept-set': [
    context: {
      ruleIndex: number
      groupIndex: number
      eventIndex: number
      nestedEventIndex?: number
    },
  ]
  'select-concept': [
    context: {
      ruleIndex: number
      groupIndex: number
      eventIndex: number
      attributeIndex: number
      domainFilter: string | undefined
    },
  ]
  'edit-concept-set': [conceptSet: { id: number | string; name: string; items?: unknown[] }]
}>()

const panelRoot = ref<HTMLElement | null>(null)
const selectedIndex = ref<number | null>(props.modelValue.length > 0 ? 0 : null)
const lastEditedIndex = ref<number | null>(null)
const ruleCounter = ref(1)

const showEditDialog = ref(false)
const editingName = ref('')
const editingRuleIndex = ref<number | null>(null)

const expressionRef = computed(() => props.expression)
const { stats, isPending, error: statsError, isInvalidExpression } =
  useInclusionStats(expressionRef)
const { isCacheReady, selectedCacheStatus, isTrexSQLEnabled } = useTrexSQLCache()

const errorCopied = ref(false)
let copyResetTimer: ReturnType<typeof setTimeout> | undefined

async function copyStatsError(): Promise<void> {
  if (!statsError.value || !navigator?.clipboard?.writeText) return
  await navigator.clipboard.writeText(statsError.value)
  errorCopied.value = true
  clearTimeout(copyResetTimer)
  copyResetTimer = setTimeout(() => {
    errorCopied.value = false
  }, 1500)
}

const cacheState = computed<'ready' | 'stale' | 'building' | 'unavailable'>(() => {
  if (!isTrexSQLEnabled.value) return 'unavailable'
  const status = selectedCacheStatus.value?.status
  if (status === 'ready' && isCacheReady.value) return 'ready'
  if (status === 'stale') return 'stale'
  if (status === 'building') return 'building'
  return 'unavailable'
})

const activeRule = computed(() =>
  selectedIndex.value === null ? null : props.modelValue[selectedIndex.value] ?? null
)

watch(
  () => props.modelValue.length,
  (len) => {
    if (len === 0) {
      selectedIndex.value = null
    } else if (selectedIndex.value === null) {
      selectedIndex.value = 0
    } else if (selectedIndex.value >= len) {
      selectedIndex.value = len - 1
    }
  }
)

function onSelect(index: number): void {
  selectedIndex.value = index
}

function onReorder({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }): void {
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

function onRuleUpdated(rule: InclusionRule): void {
  if (selectedIndex.value === null) return
  const updated = [...props.modelValue]
  updated[selectedIndex.value] = rule
  lastEditedIndex.value = selectedIndex.value
  emit('update:modelValue', updated)
}

function onSelectConceptSet(ctx: {
  groupIndex: number
  eventIndex: number
  nestedEventIndex?: number
}): void {
  if (selectedIndex.value === null) return
  emit('select-concept-set', {
    ruleIndex: selectedIndex.value,
    groupIndex: ctx.groupIndex,
    eventIndex: ctx.eventIndex,
    nestedEventIndex: ctx.nestedEventIndex,
  })
}

function onSelectConcept(ctx: {
  groupIndex: number
  eventIndex: number
  attributeIndex: number
  domainFilter: string | undefined
}): void {
  if (selectedIndex.value === null) return
  emit('select-concept', { ruleIndex: selectedIndex.value, ...ctx })
}

function removeRule(index: number): void {
  const updated = [...props.modelValue]
  updated.splice(index, 1)
  emit('update:modelValue', updated)
}

async function addNewRule(): Promise<void> {
  const defaultGroup: CriteriaGroup = { id: uuidv4(), logicType: 'ALL', events: [] }
  const newRule: InclusionRule = {
    id: uuidv4(),
    name: `New Inclusion Rule ${ruleCounter.value}`,
    description: undefined,
    criteriaGroups: [defaultGroup],
  }
  ruleCounter.value++
  const updated = [...props.modelValue, newRule]
  emit('update:modelValue', updated)
  selectedIndex.value = updated.length - 1
  await nextTick()
  await nextTick()
  panelRoot.value
    ?.querySelector<HTMLButtonElement>('[data-testid="add-event-to-group"]')
    ?.click()
}

function openEditDialog(index: number): void {
  const rule = props.modelValue[index]
  if (!rule) return
  editingRuleIndex.value = index
  editingName.value = rule.name
  showEditDialog.value = true
}

function saveEditedName(): void {
  if (editingRuleIndex.value === null) return
  const updated = [...props.modelValue]
  const rule = updated[editingRuleIndex.value]
  if (rule) {
    rule.name = editingName.value || `New Inclusion Rule ${editingRuleIndex.value + 1}`
    emit('update:modelValue', updated)
  }
  showEditDialog.value = false
  editingRuleIndex.value = null
  editingName.value = ''
}

</script>

<style scoped>
.inclusion-criteria-panel {
  padding: 12px 20px 16px;
}

.inclusion-criteria-panel__empty {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface-variant));
}
.inclusion-criteria-panel__empty-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
  flex-shrink: 0;
}
.inclusion-criteria-panel__empty-text {
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.5;
  flex: 1;
}

.inclusion-criteria-panel__empty-add {
  flex-shrink: 0;
  margin-left: auto;
}

.inclusion-criteria-panel__layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 12px;
}

@media (max-width: 1023px) {
  .inclusion-criteria-panel__layout {
    grid-template-columns: 1fr;
  }
}

.inclusion-criteria-panel__detail-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.inclusion-criteria-panel__detail-name {
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.inclusion-criteria-panel__detail-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.inclusion-stats-error {
  cursor: help;
}
.inclusion-stats-error__hint {
  vertical-align: middle;
  opacity: 0.7;
}
.inclusion-stats-error__tooltip {
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow-y: auto;
}
</style>
