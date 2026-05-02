<template>
  <div class="coverage-stat">
    <div class="coverage-stat__label">{{ t('pathway.workbench.coverage', 'Cohort coverage').value }}</div>
    <div class="coverage-stat__value">{{ pct.toFixed(1) }}%</div>
    <div class="coverage-stat__sub">
      {{ formatNumber(totalPathwaysCount) }} {{ t('common.of', 'of').value }}
      {{ formatNumber(targetCohortCount) }}
      {{ t('pathway.workbench.coverageSuffix', 'persons with pathway').value }}
    </div>
    <div
      v-if="targetCohortName"
      class="coverage-stat__cohort"
    >{{ targetCohortName }}</div>
    <v-progress-linear
      :model-value="clampedPct"
      color="orange"
      height="6"
      rounded
      class="mt-2"
      data-testid="coverage-progress-fill"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{
  totalPathwaysCount: number
  targetCohortCount: number
  targetCohortName?: string
}>()

const { t } = useI18n()

const pct = computed(() =>
  props.targetCohortCount === 0
    ? 0
    : (props.totalPathwaysCount / props.targetCohortCount) * 100,
)

const clampedPct = computed(() => Math.max(0, Math.min(100, pct.value)))

function formatNumber(n: number): string {
  return n.toLocaleString()
}
</script>

<style scoped>
.coverage-stat {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
  padding: 12px;
}
.coverage-stat__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.62);
  margin-bottom: 4px;
}
.coverage-stat__value {
  font-size: 22px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.1;
}
.coverage-stat__sub {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  margin-top: 4px;
}
.coverage-stat__cohort {
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-top: 4px;
}
</style>
