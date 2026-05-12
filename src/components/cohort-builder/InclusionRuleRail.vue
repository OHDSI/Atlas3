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
      :key="rule.id"
      type="button"
      draggable="true"
      class="inclusion-rail__rule"
      :class="[
        toneForIndex(index) ? `inclusion-rail__rule--tone-${toneForIndex(index)}` : null,
        {
          'inclusion-rail__rule--active': index === selectedIndex,
          // All rule counts depend on the full expression, so when the
          // expression changes they all need to be recomputed — pulse
          // every rule, not just the last-edited one.
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
            <span class="inclusion-rail__rule-num">{{ index + 1 }}.</span>{{ rule.name }}
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
import type { InclusionRule } from '@/models/cohort.types'
import type { InclusionRuleStatsRow } from '@/models/trexsql.types'

const { t } = useI18n()

interface Props {
  rules: InclusionRule[]
  selectedIndex: number | null
  cacheState: 'ready' | 'stale' | 'building' | 'unavailable'
  entryEventCount: number | null
  totalDatasetCount: number | null
  ruleCounts: InclusionRuleStatsRow[] | null
  finalCount: number | null
  isComputing: boolean
  computingIndex?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  computingIndex: null,
})

const emit = defineEmits<{
  select: [index: number]
  'add-rule': []
  reorder: [payload: { fromIndex: number; toIndex: number }]
}>()

const dragSourceIndex = ref<number | null>(null)
const dropTargetIndex = ref<number | null>(null)
const dropPosition = ref<'before' | 'after' | null>(null)

function onDragStart(index: number, ev: DragEvent): void {
  dragSourceIndex.value = index
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'move'
    ev.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(index: number, ev: DragEvent): void {
  if (dragSourceIndex.value === null) return
  const target = ev.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const before = ev.clientY < rect.top + rect.height / 2
  dropTargetIndex.value = index
  dropPosition.value = before ? 'before' : 'after'
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'
}

function onDragLeave(index: number): void {
  if (dropTargetIndex.value === index) {
    dropTargetIndex.value = null
    dropPosition.value = null
  }
}

function onDrop(index: number): void {
  const from = dragSourceIndex.value
  if (from === null) return
  let to = index
  if (dropPosition.value === 'after') to = index + 1
  if (from < to) to -= 1
  if (from !== to) {
    emit('reorder', { fromIndex: from, toIndex: to })
  }
  resetDragState()
}

function onDragEnd(): void {
  resetDragState()
}

function resetDragState(): void {
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

// Tone for a rule reflects how aggressively THIS rule cuts the cohort
// compared to the previous step (or entry events for the first rule).
// retention >= 80% → success (gentle filter), >= 40% → warning, else danger.
// A rule that knocks the cohort to 0 reads loudest red; a rule that
// preserves nearly everyone reads green.
function toneForIndex(index: number): 'success' | 'warning' | 'danger' | null {
  const count = countForIndex(index)
  if (count === null) return null
  const prevCount = index === 0
    ? props.entryEventCount
    : countForIndex(index - 1)
  if (prevCount === null || prevCount <= 0) return null
  const retention = count / prevCount
  if (retention >= 0.8) return 'success'
  if (retention >= 0.4) return 'warning'
  return 'danger'
}

function formatCount(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString()
}

function summaryFor(rule: InclusionRule): string {
  const groups = rule.criteriaGroups.length
  const criteria = rule.criteriaGroups.reduce((sum, g) => sum + g.events.length, 0)
  const groupLabel =
    groups === 1
      ? t('inclusionRail.group', '1 group').value
      : t('inclusionRail.groups', `${groups} groups`, { count: groups }).value
  const critLabel =
    criteria === 1
      ? t('inclusionRail.criterion', '1 criterion').value
      : t('inclusionRail.criteria', `${criteria} criteria`, { count: criteria }).value
  return `${groupLabel} · ${critLabel}`
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
.inclusion-rail__entry {
  padding: 8px 10px;
  border-radius: 6px;
  background: rgb(var(--v-theme-primary), 0.08);
  border-left: 3px solid rgb(var(--v-theme-primary));
  margin-bottom: 4px;
}
.inclusion-rail__entry-label {
  font-weight: 600;
  font-size: 12px;
  color: rgb(var(--v-theme-primary));
}
.inclusion-rail__entry-meta {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}
.inclusion-rail__entry-pct { margin-left: 4px; }

.inclusion-rail__rule {
  position: relative;
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px 8px 22px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  margin-bottom: 3px;
  overflow: hidden;
  font: inherit;
  color: inherit;
  transition: opacity 0.15s, box-shadow 0.15s;
}
.inclusion-rail__rule:hover {
  background: rgb(var(--v-theme-surface-variant));
}
/* The selection marker is a primary-colored left stripe rather than a
 * full background fill. The previous fill made `.rule-count` and
 * `.rule-pct` inherit white-on-primary, which hid the green/amber/red
 * tone signal on the selected rule — the very rule the user is most
 * likely inspecting. The stripe keeps the selection visible while
 * letting tonal colors carry through. */
.inclusion-rail__rule--active {
  background: rgb(var(--v-theme-primary), 0.08);
  box-shadow: inset 3px 0 0 0 rgb(var(--v-theme-primary));
}
.inclusion-rail__rule-handle {
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  font-size: 10px;
  letter-spacing: -2px;
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0;
  cursor: grab;
  transition: opacity 0.15s;
}
.inclusion-rail__rule:hover .inclusion-rail__rule-handle,
.inclusion-rail__rule--dragging .inclusion-rail__rule-handle {
  opacity: 0.6;
}
.inclusion-rail__rule--active .inclusion-rail__rule-handle {
  color: rgb(var(--v-theme-on-primary));
}
.inclusion-rail__rule--dragging {
  opacity: 0.4;
}
.inclusion-rail__rule--drop-before {
  box-shadow: inset 0 2px 0 0 rgb(var(--v-theme-primary));
}
.inclusion-rail__rule--drop-after {
  box-shadow: inset 0 -2px 0 0 rgb(var(--v-theme-primary));
}
.inclusion-rail__rule-fill {
  position: absolute;
  inset: 0;
  background: rgb(var(--v-theme-success), 0.25);
  border-radius: 6px;
  z-index: 0;
}
/* Tint the fill, count, and percent based on how aggressive the rule is.
 * The default is success-green; --tone-warning swaps to amber for rules
 * that drop the cohort meaningfully; --tone-danger goes red for rules
 * that gut it (or zero it out). */
.inclusion-rail__rule--tone-warning .inclusion-rail__rule-fill {
  background: rgb(var(--v-theme-warning), 0.25);
}
.inclusion-rail__rule--tone-danger .inclusion-rail__rule-fill {
  background: rgb(var(--v-theme-error), 0.25);
}
.inclusion-rail__rule-content {
  position: relative;
  z-index: 1;
  display: block;
}
.inclusion-rail__rule-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
}
.inclusion-rail__rule-name {
  font-weight: 600;
  font-size: 12px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inclusion-rail__rule-num {
  opacity: 0.55;
  margin-right: 4px;
}
.inclusion-rail__rule-count {
  font-weight: 600;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-success));
}
.inclusion-rail__rule--tone-warning .inclusion-rail__rule-count {
  color: rgb(var(--v-theme-warning));
}
.inclusion-rail__rule--tone-danger .inclusion-rail__rule-count {
  color: rgb(var(--v-theme-error));
}
.inclusion-rail__rule-bottom {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: 1px;
  font-size: 10px;
}
.inclusion-rail__rule-meta {
  color: rgb(var(--v-theme-on-surface-variant));
}
.inclusion-rail__rule-pct {
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-success));
}
.inclusion-rail__rule--tone-warning .inclusion-rail__rule-pct {
  color: rgb(var(--v-theme-warning));
}
.inclusion-rail__rule--tone-danger .inclusion-rail__rule-pct {
  color: rgb(var(--v-theme-error));
}

/* Pulse the count's opacity in place rather than appending a "…",
 * so the number doesn't shift while the new value is being computed.
 * Applies to entry-event header, every rule, and the final qualifying
 * cohort badge — all three depend on the full expression. */
.inclusion-rail__rule--computing .inclusion-rail__rule-count,
.inclusion-rail__rule--computing .inclusion-rail__rule-pct,
.inclusion-rail__entry--computing .inclusion-rail__entry-meta,
.inclusion-rail__final--computing .inclusion-rail__final-count,
.inclusion-rail__final--computing .inclusion-rail__final-pct {
  animation: inclusion-rail-pulse 1.2s ease-in-out infinite;
}
@keyframes inclusion-rail-pulse {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 1; }
}

.inclusion-rail__final {
  margin-top: 8px;
  padding: 10px;
  border-radius: 6px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.inclusion-rail__final-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  opacity: 0.85;
}
.inclusion-rail__final-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: 2px;
}
.inclusion-rail__final-count {
  font-size: 22px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.inclusion-rail__final-pct {
  font-size: 11px;
  opacity: 0.9;
  font-variant-numeric: tabular-nums;
}

.inclusion-rail--stale .inclusion-rail__rule-fill { opacity: 0.4; }
.inclusion-rail--stale .inclusion-rail__rule-count { color: rgb(var(--v-theme-warning)); }
</style>
