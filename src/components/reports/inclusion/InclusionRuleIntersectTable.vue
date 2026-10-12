<template>
  <table
    class="intersect-table"
    data-testid="inclusion-intersect-table"
  >
    <thead>
      <tr>
        <th class="intersect-table__col-check">
          <AtlasCheckbox
            :model-value="allSelected"
            :indeterminate="someSelected"
            :aria-label="t('components.inclusionRuleReport.selectAllRules', 'Select all rules').value"
            hide-details
            data-testid="inclusion-intersect-select-all"
            @update:model-value="toggleAll"
          />
        </th>
        <th class="intersect-table__col-idx">
          #
        </th>
        <th>
          {{ t('components.feasibilityAttritionReport.inclusionRule', 'Inclusion rule').value }}
        </th>
        <th class="intersect-table__col-num">
          N
        </th>
        <th class="intersect-table__col-num">
          <span :title="t('components.inclusionRuleReport.hintPercentSatisfying', 'Percent of the entry-event population who satisfy this rule on its own (independent of order)').value">
            {{ t('components.inclusionRuleReport.colPercentSatisfying', '% satisfying').value }}
          </span>
        </th>
        <th class="intersect-table__col-num">
          <span :title="t('components.inclusionRuleReport.hintPercentToGain', 'Share of the initial population that satisfies every other rule but fails this one, so would be gained by removing it').value">
            {{ t('components.inclusionRuleReport.colPercentToGain', '% to-gain').value }}
          </span>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(rule, idx) in rules"
        :key="rule.id"
        :class="{ 'intersect-table__row--off': !selected.includes(idx) }"
        :data-testid="`inclusion-intersect-row-${idx}`"
      >
        <td class="intersect-table__col-check">
          <AtlasCheckbox
            :model-value="selected.includes(idx)"
            :aria-label="rule.name"
            hide-details
            :data-testid="`inclusion-intersect-rule-${idx}`"
            @update:model-value="toggle(idx, $event)"
          />
        </td>
        <td class="intersect-table__col-idx">
          {{ idx + 1 }}.
        </td>
        <td>{{ rule.name }}</td>
        <td class="intersect-table__col-num">
          {{ formatCount(rule.countSatisfying) }}
        </td>
        <td class="intersect-table__col-num">
          {{ formatPercent(rule.percentSatisfying) }}
        </td>
        <td class="intersect-table__col-num">
          {{ formatPercent(rule.percentExcluded) }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasCheckbox } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { InclusionRuleStatistic } from '@/models/report.types'

const { t } = useI18n()

const props = defineProps<{
  rules: InclusionRuleStatistic[]
  /** Checked rule indexes (rule 0 first), kept sorted. */
  selected: number[]
}>()

const emit = defineEmits<{ 'update:selected': [value: number[]] }>()

const allSelected = computed(() => props.rules.length > 0 && props.selected.length === props.rules.length)
const someSelected = computed(() => props.selected.length > 0 && !allSelected.value)

// Header checkbox: Atlas 2 clears everything when all rules are checked, otherwise checks all.
function toggleAll() {
  emit('update:selected', allSelected.value ? [] : props.rules.map((_, i) => i))
}

function toggle(idx: number, checked: boolean) {
  const rest = props.selected.filter(i => i !== idx)
  emit('update:selected', checked ? [...rest, idx].sort((a, b) => a - b) : rest)
}

function formatCount(n: number): string {
  return new Intl.NumberFormat().format(n)
}

function formatPercent(s: string): string {
  if (!s) return '—'
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? `${n.toFixed(2)}%` : s
}
</script>

<style scoped>
.intersect-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.intersect-table th,
.intersect-table td {
  padding: 4px 10px;
  border-bottom: 1px solid var(--atlas-color-outline-variant);
  text-align: left;
}
.intersect-table th {
  background: var(--atlas-color-surface-variant);
  font-weight: 600;
  color: var(--atlas-color-on-surface);
}
.intersect-table__col-check {
  width: 48px;
}
.intersect-table__col-idx {
  width: 36px;
  text-align: right;
  color: var(--atlas-color-on-surface-variant);
}
.intersect-table__col-num {
  width: 110px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.intersect-table__row--off td:not(.intersect-table__col-check) {
  color: var(--atlas-color-on-surface-variant);
  opacity: 0.6;
}
</style>
