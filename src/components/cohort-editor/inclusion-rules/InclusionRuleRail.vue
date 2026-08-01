<template>
  <div class="inclusion-rail">
    <div class="inclusion-rail__header">
      <span class="inclusion-rail__heading">
        {{ t('inclusionRail.title', 'Inclusion rules').value }}
        <span class="inclusion-rail__count">({{ rules.length }})</span>
      </span>
      <AtlasButton
        size="sm"
        variant="primary"
        icon="mdi-plus"
        data-testid="inclusion-rail-add"
        @click="$emit('add-rule')"
      >
        {{ t('inclusionRail.add', 'Add rule').value }}
      </AtlasButton>
    </div>

    <button
      v-for="(rule, index) in rules"
      :key="index"
      type="button"
      draggable="true"
      class="inclusion-rail__rule"
      :class="[
        toneForIndex(index) ? `inclusion-rail__rule--tone-${toneForIndex(index)}` : null,
        {
          'inclusion-rail__rule--active': index === selectedIndex,
          'inclusion-rail__rule--dragging': dragSourceIndex === index,
          'inclusion-rail__rule--drop-before': dropTargetIndex === index && dropPosition === 'before',
          'inclusion-rail__rule--drop-after': dropTargetIndex === index && dropPosition === 'after',
        },
      ]"
      data-testid="inclusion-rail-rule"
      @click="$emit('select', index)"
      @dragstart="onDragStart(index, $event)"
      @dragover.prevent="onDragOver(index, $event)"
      @dragleave="onDragLeave(index)"
      @drop.prevent="onDrop(index)"
      @dragend="onDragEnd"
    >
      <span class="inclusion-rail__rule-handle">⋮⋮</span>
      <span class="inclusion-rail__rule-content">
        <span class="inclusion-rail__rule-top">
          <span class="inclusion-rail__rule-name">
            <span class="inclusion-rail__rule-num">{{ index + 1 }}.</span>
            {{ rule.name || t('inclusionRail.unnamedRule', 'Unnamed Rule').value }}
          </span>
        </span>
        <span class="inclusion-rail__rule-bottom">
          <span class="inclusion-rail__rule-meta">
            {{ summaryFor(rule) }}
          </span>
        </span>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { AtlasButton } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { CriteriaGroup, InclusionRule } from '../circe.types'

const { t } = useI18n()

interface Props {
  rules: InclusionRule[]
  selectedIndex: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [index: number]
  'add-rule': []
  reorder: [payload: { fromIndex: number; toIndex: number }]
}>()

const dragSourceIndex = ref<number | null>(null)
const dropTargetIndex = ref<number | null>(null)
const dropPosition = ref<'before' | 'after' | null>(null)

function onDragStart(index: number, ev: DragEvent) {
  dragSourceIndex.value = index
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'move'
    ev.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(index: number, ev: DragEvent) {
  if (dragSourceIndex.value === null) return
  const target = ev.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const before = ev.clientY < rect.top + rect.height / 2
  dropTargetIndex.value = index
  dropPosition.value = before ? 'before' : 'after'
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'
}

function onDragLeave(index: number) {
  if (dropTargetIndex.value === index) {
    dropTargetIndex.value = null
    dropPosition.value = null
  }
}

function onDrop(index: number) {
  const from = dragSourceIndex.value
  if (from === null) return

  let to = index
  if (dropPosition.value === 'after') {
    to = index + 1
  }
  if (from < to) {
    to -= 1
  }

  if (from !== to) {
    emit('reorder', { fromIndex: from, toIndex: to })
  }

  resetDragState()
}

function onDragEnd() {
  resetDragState()
}

function resetDragState() {
  dragSourceIndex.value = null
  dropTargetIndex.value = null
  dropPosition.value = null
}

function toneForIndex(index: number): 'success' | 'warning' | 'danger' | null {
  const rule = props.rules[index]
  if (!rule) return null

  const summary = countExpression(rule.expression)
  if (summary.total === 0) return null
  const previousRule = index > 0 ? props.rules[index - 1] : undefined
  const previous = index === 0 ? summary.total : countExpression(previousRule?.expression).total
  if (previous <= 0) return null

  const retention = summary.total / previous
  if (retention >= 0.8) return 'success'
  if (retention >= 0.4) return 'warning'
  return 'danger'
}

function summaryFor(rule: InclusionRule): string {
  const summary = countExpression(rule.expression)
  const groupLabel = summary.groups === 1 ? '1 group' : `${summary.groups} groups`
  const critLabel = summary.criteria === 1 ? '1 criterion' : `${summary.criteria} criteria`
  return `${groupLabel} · ${critLabel}`
}

function countExpression(group: CriteriaGroup | undefined): { groups: number; criteria: number; total: number } {
  if (!group) {
    return { groups: 0, criteria: 0, total: 0 }
  }

  const groups = group.Groups?.length ?? 0
  const criteria = (group.CriteriaList?.length ?? 0) + (group.DemographicCriteriaList?.length ?? 0)
  return { groups, criteria, total: groups + criteria }
}
</script>

<style scoped>
.inclusion-rail {
  font-size: 12px;
}

.inclusion-rail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 8px;
}

.inclusion-rail__heading {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.inclusion-rail__count {
  margin-left: 4px;
  opacity: 0.7;
}

.inclusion-rail__rule {
  width: 100%;
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  border: 1px solid rgb(var(--v-theme-outline));
  background: rgb(var(--v-theme-surface));
  cursor: pointer;
  text-align: left;
}

.inclusion-rail__rule--active {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary), 0.08);
}

.inclusion-rail__rule-handle {
  flex: 0 0 auto;
  width: 16px;
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.8;
}

.inclusion-rail__rule-content {
  min-width: 0;
  flex: 1 1 auto;
}

.inclusion-rail__rule-top,
.inclusion-rail__rule-bottom {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.inclusion-rail__rule-name {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.inclusion-rail__rule-num {
  margin-right: 4px;
  color: rgb(var(--v-theme-primary));
}

.inclusion-rail__rule-meta {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 11px;
}

.inclusion-rail__rule--tone-success {
  border-left: 3px solid rgb(var(--v-theme-success));
}

.inclusion-rail__rule--tone-warning {
  border-left: 3px solid rgb(var(--v-theme-warning));
}

.inclusion-rail__rule--tone-danger {
  border-left: 3px solid rgb(var(--v-theme-error));
}

.inclusion-rail__rule--dragging {
  opacity: 0.7;
}

.inclusion-rail__rule--drop-before {
  box-shadow: inset 0 2px 0 rgb(var(--v-theme-primary));
}

.inclusion-rail__rule--drop-after {
  box-shadow: inset 0 -2px 0 rgb(var(--v-theme-primary));
}
</style>
