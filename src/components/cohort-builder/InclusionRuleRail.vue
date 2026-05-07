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
      class="inclusion-rail__rule"
      :class="{
        'inclusion-rail__rule--active': index === selectedIndex,
        'inclusion-rail__rule--computing': isComputing && index === computingIndex,
      }"
      data-testid="inclusion-rail-rule"
      @click="$emit('select', index)"
    >
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
import { computed } from 'vue'
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

defineEmits<{
  select: [index: number]
  'add-rule': []
}>()

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
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 8px;
  padding: 8px;
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
  padding: 8px 10px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  margin-bottom: 3px;
  overflow: hidden;
  font: inherit;
  color: inherit;
}
.inclusion-rail__rule:hover {
  background: rgb(var(--v-theme-surface-variant));
}
.inclusion-rail__rule--active {
  background: rgb(var(--v-theme-primary)) !important;
  color: rgb(var(--v-theme-on-primary));
}
.inclusion-rail__rule-fill {
  position: absolute;
  inset: 0;
  background: rgb(var(--v-theme-success), 0.25);
  border-radius: 6px;
  z-index: 0;
}
.inclusion-rail__rule--active .inclusion-rail__rule-fill {
  background: rgb(var(--v-theme-on-primary), 0.2);
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
.inclusion-rail__rule--active .inclusion-rail__rule-count {
  color: inherit;
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
.inclusion-rail__rule--active .inclusion-rail__rule-meta { color: inherit; opacity: 0.85; }
.inclusion-rail__rule-pct {
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-success));
}
.inclusion-rail__rule--active .inclusion-rail__rule-pct { color: inherit; opacity: 0.85; }

.inclusion-rail__rule--computing .inclusion-rail__rule-count::after {
  content: ' …';
  animation: inclusion-rail-pulse 1.2s ease-in-out infinite;
}
@keyframes inclusion-rail-pulse {
  0%, 100% { opacity: 0.3; }
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
