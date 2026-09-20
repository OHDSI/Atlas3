<template>
  <div
    class="inclusion-rail"
    :class="{
      'inclusion-rail--ready': cacheState === 'ready',
      'inclusion-rail--stale': cacheState === 'stale',
    }"
  >
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

    <!-- Live preview datasource picker. The counts below are scoped to
         whichever source is chosen here. -->
    <div class="inclusion-rail__preview-selector">
      <CachePreviewSelector />
    </div>

    <div
      v-if="cacheState === 'ready' || cacheState === 'stale'"
      class="inclusion-rail__entry"
      :class="{ 'inclusion-rail__entry--computing': isComputing }"
      data-testid="inclusion-rail-entry"
    >
      <div class="inclusion-rail__entry-label">
        {{ t('inclusionRail.entryEvents', 'Entry events').value }}
      </div>
      <div class="inclusion-rail__entry-meta">
        <strong>{{ formatCount(entryEventCount) }}</strong>
        {{ t('inclusionRail.of', 'of').value }}
        <strong>{{ formatCount(totalDatasetCount) }}</strong>
        {{ t('inclusionRail.datasetPatients', 'dataset patients').value }}
        <span
          v-if="datasetPercentage !== null"
          class="inclusion-rail__entry-pct"
        >· {{ datasetPercentage }}%</span>
      </div>
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
          // Every rule count is derived from the whole expression, so an edit
          // invalidates all of them at once — pulse the lot, not just the
          // rule that changed.
          'inclusion-rail__rule--computing': isComputing,
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
      <span
        v-if="hasFunnel && fillPercentForIndex(index) !== null"
        class="inclusion-rail__rule-fill"
        :style="{ width: fillPercentForIndex(index) + '%' }"
      />
      <span class="inclusion-rail__rule-content">
        <span class="inclusion-rail__rule-top">
          <span class="inclusion-rail__rule-name">
            <span class="inclusion-rail__rule-num">{{ index + 1 }}.</span>
            {{ rule.name || t('inclusionRail.unnamedRule', 'Unnamed Rule').value }}
          </span>
          <span
            v-if="hasFunnel"
            class="inclusion-rail__rule-count"
          >{{ formatCount(countForIndex(index)) }}</span>
        </span>
        <span class="inclusion-rail__rule-bottom">
          <span class="inclusion-rail__rule-meta">
            {{ summaryFor(rule) }}
          </span>
          <span
            v-if="hasFunnel && pctForIndex(index) !== null"
            class="inclusion-rail__rule-pct"
          >{{ pctForIndex(index) }}%</span>
        </span>
      </span>
    </button>

    <div
      v-if="hasFunnel && finalCount !== null"
      class="inclusion-rail__final"
      :class="{ 'inclusion-rail__final--computing': isComputing }"
      data-testid="inclusion-rail-final"
    >
      <div class="inclusion-rail__final-label">
        {{ t('inclusionRail.qualifyingCohort', 'Qualifying cohort').value }}
      </div>
      <div class="inclusion-rail__final-row">
        <span class="inclusion-rail__final-count">{{ formatCount(finalCount) }}</span>
        <span
          v-if="finalPct !== null"
          class="inclusion-rail__final-pct"
        >{{ finalPct }}% {{ t('inclusionRail.ofEntry', 'of entry').value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { AtlasButton } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { CriteriaGroup, InclusionRule } from '@/models/circe-types'
import type { InclusionRuleStatsRow } from '@/models/trexsql.types'
import CachePreviewSelector from '@/components/cohort-editor/CachePreviewSelector.vue'

const { t } = useI18n()

interface Props {
  rules: InclusionRule[]
  selectedIndex: number | null
  cacheState?: 'ready' | 'stale' | 'building' | 'unavailable'
  entryEventCount?: number | null
  totalDatasetCount?: number | null
  ruleCounts?: InclusionRuleStatsRow[] | null
  finalCount?: number | null
  isComputing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  cacheState: 'unavailable',
  entryEventCount: null,
  totalDatasetCount: null,
  ruleCounts: null,
  finalCount: null,
  isComputing: false,
})

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

const hasFunnel = computed(
  () => (props.cacheState === 'ready' || props.cacheState === 'stale') && props.ruleCounts !== null
)

const datasetPercentage = computed(() => {
  if (props.entryEventCount === null || !props.totalDatasetCount) return null
  return ((props.entryEventCount / props.totalDatasetCount) * 100).toFixed(1)
})

const finalPct = computed(() => {
  if (props.finalCount === null || !props.entryEventCount) return null
  return Math.round((props.finalCount / props.entryEventCount) * 100)
})

function countForIndex(index: number): number | null {
  return props.ruleCounts?.find(r => r.ruleIndex === index)?.cumulativeCount ?? null
}

function fillPercentForIndex(index: number): number | null {
  if (!props.entryEventCount) return null
  const count = countForIndex(index)
  if (count === null) return null
  return (count / props.entryEventCount) * 100
}

function pctForIndex(index: number): number | null {
  const fill = fillPercentForIndex(index)
  return fill === null ? null : Math.round(fill)
}

function formatCount(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString()
}

// Tone reflects how aggressively THIS rule cuts the cohort relative to the
// previous step (entry events for the first rule): >= 80% retained reads
// green, >= 40% amber, below that red.
//
// It is deliberately driven by live patient counts and returns null without
// them. The interim implementation used each rule's *criteria count* as the
// input, which coloured a rule by how many clauses someone had typed rather
// than by how many patients it removed — a two-criteria rule that excluded
// nobody still showed red.
function toneForIndex(index: number): 'success' | 'warning' | 'danger' | null {
  const count = countForIndex(index)
  if (count === null) return null
  const prevCount = index === 0 ? props.entryEventCount : countForIndex(index - 1)
  if (prevCount === null || prevCount <= 0) return null

  const retention = count / prevCount
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

function countExpression(group: CriteriaGroup | null | undefined): { groups: number; criteria: number; total: number } {
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

.inclusion-rail__preview-selector {
  padding: 0 8px 8px;
}

.inclusion-rail__entry,
.inclusion-rail__final {
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface-variant));
  border: 1px solid rgb(var(--v-theme-outline));
}

.inclusion-rail__entry-label,
.inclusion-rail__final-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-on-surface-variant));
}

.inclusion-rail__entry-meta {
  margin-top: 2px;
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.inclusion-rail__entry-pct {
  opacity: 0.8;
}

.inclusion-rail__final-row {
  margin-top: 2px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.inclusion-rail__final-count {
  font-size: 16px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.inclusion-rail__final-pct {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
}

/* The fill bar sits behind the rule's text as a proportional backdrop, so it
   must not intercept clicks meant for the rule button. */
.inclusion-rail__rule {
  position: relative;
  overflow: hidden;
}

.inclusion-rail__rule-fill {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  background: rgb(var(--v-theme-primary), 0.1);
  pointer-events: none;
  z-index: 0;
}

.inclusion-rail__rule-content,
.inclusion-rail__rule-handle {
  position: relative;
  z-index: 1;
}

.inclusion-rail__rule-count {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface));
}

.inclusion-rail__rule-pct {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
  font-variant-numeric: tabular-nums;
}

/* Counts are stale while a new expression is in flight; dim rather than
   replace them so the rail does not jump between values and spinners. */
.inclusion-rail__rule--computing .inclusion-rail__rule-count,
.inclusion-rail__rule--computing .inclusion-rail__rule-pct,
.inclusion-rail__entry--computing .inclusion-rail__entry-meta,
.inclusion-rail__final--computing .inclusion-rail__final-row {
  opacity: 0.45;
  transition: opacity 120ms ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .inclusion-rail__rule--computing .inclusion-rail__rule-count,
  .inclusion-rail__rule--computing .inclusion-rail__rule-pct,
  .inclusion-rail__entry--computing .inclusion-rail__entry-meta,
  .inclusion-rail__final--computing .inclusion-rail__final-row {
    transition: none;
  }
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
