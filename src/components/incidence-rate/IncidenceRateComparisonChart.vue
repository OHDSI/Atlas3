<template>
  <AtlasCard
    v-if="rows.length > 0"
    padding="sm"
    class="ir-overview"
    data-testid="ir-comparison-chart"
  >
    <div class="ir-overview__title">
      Outcome Overview
    </div>
    <div class="ir-overview__note">
      Click a row to inspect. Each outcome excludes persons who already had the event at index.
    </div>
    <table class="ir-overview__table">
      <thead>
        <tr>
          <th class="ir-overview__th">
            Outcome
          </th>
          <th class="ir-overview__th ir-overview__th--num">
            Persons at Risk
          </th>
          <th class="ir-overview__th ir-overview__th--num">
            Cases
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.outcomeId"
          class="ir-overview__row"
          :class="{ 'ir-overview__row--active': row.outcomeId === selectedOutcomeId }"
          @click="$emit('select', row.outcomeId)"
        >
          <td class="ir-overview__td">
            {{ row.name }}
          </td>
          <td class="ir-overview__td ir-overview__td--num">
            {{ row.persons.toLocaleString() }}
          </td>
          <td class="ir-overview__td ir-overview__td--num">
            {{ row.cases.toLocaleString() }}
          </td>
        </tr>
      </tbody>
    </table>
  </AtlasCard>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { AtlasCard } from '@/components/ui'
import { getIncidenceRateReport } from '@/services/webapi'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { logger } from '@/utils/logger'

const props = defineProps<{
  irId: number
  sourceKey: string
  targetId: number
  selectedOutcomeId: number | null
}>()

defineEmits<{
  select: [outcomeId: number]
}>()

const store = useIncidenceRateStore()

interface RowData {
  outcomeId: number
  name: string
  persons: number
  cases: number
}

const outcomeData = ref<Map<number, { persons: number; cases: number }>>(new Map())

async function loadAllOutcomes() {
  if (!store.currentIR) return
  const outcomes = store.currentIR.expression.outcomeIds
  const results = await Promise.all(
    outcomes.map(async outcomeId => {
      try {
        const result = await getIncidenceRateReport(props.irId, props.sourceKey, props.targetId, outcomeId)
        if (result.success) {
          return { outcomeId, persons: result.data.summary.totalPersons, cases: result.data.summary.cases }
        }
      } catch (err) {
        logger.debug('IROverview', `Failed to load outcome ${outcomeId}`, err)
      }
      return { outcomeId, persons: 0, cases: 0 }
    })
  )
  const map = new Map<number, { persons: number; cases: number }>()
  for (const r of results) map.set(r.outcomeId, { persons: r.persons, cases: r.cases })
  outcomeData.value = map
}

watch(
  () => [props.irId, props.sourceKey, props.targetId],
  () => { if (props.irId && props.sourceKey && props.targetId) loadAllOutcomes() },
  { immediate: true },
)

const rows = computed<RowData[]>(() => {
  if (outcomeData.value.size === 0) return []
  const outcomes = store.currentIR?.expression.outcomeIds ?? []
  return outcomes.map(id => ({
    outcomeId: id,
    name: store.cohortNameById.get(id) ?? `Cohort ${id}`,
    persons: outcomeData.value.get(id)?.persons ?? 0,
    cases: outcomeData.value.get(id)?.cases ?? 0,
  }))
})
</script>

<style scoped>
.ir-overview__title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.55);
  margin-bottom: 4px;
}
.ir-overview__note {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-style: italic;
  margin-bottom: 8px;
}
.ir-overview__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.ir-overview__th {
  text-align: left;
  padding: 6px 8px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(var(--v-theme-on-surface), 0.55);
  border-bottom: 2px solid rgba(var(--v-theme-on-surface), 0.12);
}
.ir-overview__th--num {
  text-align: right;
}
.ir-overview__td {
  padding: 6px 8px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}
.ir-overview__td--num {
  text-align: right;
}
.ir-overview__row {
  cursor: pointer;
  transition: background 0.15s;
}
.ir-overview__row:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}
.ir-overview__row--active {
  font-weight: 600;
  background: rgba(var(--v-theme-primary), 0.08);
}
</style>
