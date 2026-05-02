<template>
  <div class="path-stats">
    <div class="path-stats__summary">
      <div class="path-stats__chips">
        <template
          v-for="(c, i) in stats.summary.chips"
          :key="i"
        >
          <span
            class="path-stats__chip"
            :style="{ backgroundColor: colors(c.colorKey) }"
            :title="c.name"
          />
          <span class="path-stats__chip-name">{{ c.name }}</span>
          <span
            v-if="i < stats.summary.chips.length - 1"
            class="path-stats__arrow"
          >→</span>
        </template>
      </div>
      <div class="path-stats__persons">
        {{ stats.summary.persons.toLocaleString() }}
        <span class="path-stats__persons-label">{{ t('pathway.workbench.persons', 'persons').value }}</span>
      </div>
      <div class="path-stats__sub">
        {{ stats.summary.pctOfCohort.toFixed(1) }}% {{ t('pathway.workbench.ofCohort', 'of cohort').value }}
        ·
        {{ stats.summary.pctOfPathways.toFixed(1) }}% {{ t('pathway.workbench.ofPathways', 'of pathways').value }}
      </div>
    </div>

    <div class="path-stats__section-label">
      {{ t('pathway.workbench.stepBreakdown', 'Step breakdown').value }}
    </div>
    <div class="path-stats__steps">
      <div
        v-for="(s, i) in stats.steps"
        :key="i"
        class="path-stats__step"
        data-testid="path-step-row"
      >
        <span class="path-stats__step-idx">{{ i + 1 }}</span>
        <span
          class="path-stats__step-swatch"
          :style="{ backgroundColor: colors(s.colorKey) }"
        />
        <span class="path-stats__step-name">{{ s.name }}</span>
        <span class="path-stats__step-count">
          {{ s.entered.toLocaleString() }}
          <span
            v-if="i > 0"
            class="path-stats__step-pct"
          >({{ Math.round(s.retentionPct) }}%)</span>
        </span>
      </div>
    </div>

    <div class="path-stats__section-label">
      {{ t('pathway.workbench.pathStats', 'Path stats').value }}
    </div>
    <div class="path-stats__stat-rows">
      <div
        class="path-stats__stat-row"
        data-testid="path-stat-row"
      >
        <span>{{ t('pathway.workbench.medianDuration', 'Median duration').value }}</span>
        <span class="path-stats__stat-v">{{ formatDays(stats.stats.medianDurationDays) }}</span>
      </div>
      <div
        class="path-stats__stat-row"
        data-testid="path-stat-row"
      >
        <span>{{ t('pathway.workbench.medianStepGap', 'Median step gap').value }}</span>
        <span class="path-stats__stat-v">{{ formatDays(stats.stats.medianStepGapDays) }}</span>
      </div>
      <div
        class="path-stats__stat-row"
        data-testid="path-stat-row"
      >
        <span>{{ t('pathway.workbench.daysToStep1', 'Cohort entry → step 1').value }}</span>
        <span class="path-stats__stat-v">{{ formatDays(stats.stats.daysToStep1) }}</span>
      </div>
      <div
        class="path-stats__stat-row"
        data-testid="path-stat-row"
      >
        <span>{{ t('pathway.workbench.continuedPastLast', 'Continued past last step').value }}</span>
        <span class="path-stats__stat-v">{{ stats.stats.continuedPastLastStep === null ? '—' : stats.stats.continuedPastLastStep.toLocaleString() }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PathStatsOutput } from '@/utils/pathway-path-stats'
import { useI18n } from '@/composables/useI18n'

defineProps<{
  stats: PathStatsOutput
  colors: (key: string) => string
}>()

const { t } = useI18n()

function formatDays(value: number | null): string {
  if (value === null) return '—'
  return `${value} d`
}
</script>

<style scoped>
.path-stats {
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
}
.path-stats__summary {
  background: rgba(var(--v-theme-orange), 0.08);
  border: 1px solid rgba(var(--v-theme-orange), 0.25);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}
.path-stats__chips {
  font-size: 13px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.path-stats__chip {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
}
.path-stats__chip-name { font-weight: 600; }
.path-stats__arrow { color: rgba(var(--v-theme-on-surface), 0.4); margin: 0 4px; }
.path-stats__persons { font-size: 18px; font-weight: 600; line-height: 1.1; }
.path-stats__persons-label { font-size: 11px; font-weight: 500; color: rgba(var(--v-theme-orange), 0.85); margin-left: 4px; }
.path-stats__sub { font-size: 11px; color: rgba(var(--v-theme-orange), 0.85); margin-top: 4px; }

.path-stats__section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.62);
  margin: 12px 0 6px;
}

.path-stats__step {
  display: grid;
  grid-template-columns: 18px 12px 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 4px 0;
  font-size: 12px;
}
.path-stats__step-idx {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
}
.path-stats__step-swatch { width: 10px; height: 10px; border-radius: 2px; }
.path-stats__step-count { font-variant-numeric: tabular-nums; color: rgba(var(--v-theme-on-surface), 0.62); font-size: 11px; }
.path-stats__step-pct { color: rgba(var(--v-theme-on-surface), 0.62); margin-left: 2px; }

.path-stats__stat-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.path-stats__stat-v { font-weight: 600; color: rgb(var(--v-theme-on-surface)); }
</style>
