<template>
  <aside class="ir-rail" data-testid="ir-design-rail">
    <v-expansion-panels
      v-model="openPanels"
      multiple
      variant="accordion"
      class="ir-rail__panels"
    >
      <v-expansion-panel value="targets" data-testid="ir-rail-panel-targets">
        <v-expansion-panel-title>
          <span class="text-eyebrow">{{ t('facets.caption.targetCohorts', 'Target cohorts').value }}</span>
          <template #actions="{ expanded }">
            <v-btn
              variant="text"
              size="small"
              density="compact"
              prepend-icon="mdi-plus"
              :disabled="readonly"
              @click.stop="openTarget = true"
            >{{ t('common.add', 'Add').value }}</v-btn>
            <v-icon>{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </template>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <IncidenceRateCohortList
            :cohorts="targetCohorts"
            @remove="(id: number) => store.removeTargetCohortId(id)"
          />
          <IncidenceRateCohortPicker
            v-model="openTarget"
            @select="(c: { id: number; name: string }) => store.addTargetCohortId(c.id, c.name)"
          />
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel value="outcomes" data-testid="ir-rail-panel-outcomes">
        <v-expansion-panel-title>
          <span class="text-eyebrow">{{ t('columns.outcomes', 'Outcome cohorts').value }}</span>
          <template #actions="{ expanded }">
            <v-btn
              variant="text"
              size="small"
              density="compact"
              prepend-icon="mdi-plus"
              :disabled="readonly"
              @click.stop="openOutcome = true"
            >{{ t('common.add', 'Add').value }}</v-btn>
            <v-icon>{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </template>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <IncidenceRateCohortList
            :cohorts="outcomeCohorts"
            @remove="(id: number) => store.removeOutcomeCohortId(id)"
          />
          <IncidenceRateCohortPicker
            v-model="openOutcome"
            @select="(c: { id: number; name: string }) => store.addOutcomeCohortId(c.id, c.name)"
          />
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel value="tar" data-testid="ir-rail-panel-tar">
        <v-expansion-panel-title>
          <span class="text-eyebrow">{{ t('cohortDefinitions.appearance.timeAtRisk', 'Time at risk').value }}</span>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <IncidenceRateTimeAtRiskEditor />
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel value="window" data-testid="ir-rail-panel-window">
        <v-expansion-panel-title>
          <span class="text-eyebrow">{{ t('incidenceRate.studyWindow', 'Study window').value }}</span>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <IncidenceRateStudyWindowEditor />
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel value="strata" data-testid="ir-rail-panel-strata">
        <v-expansion-panel-title>
          <span class="text-eyebrow">{{ t('ir.editor.stratifyCriteria', 'Stratify rules').value }}</span>
          <span class="ir-rail__count">{{ strataCount }}</span>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <IncidenceRateStratifyRulesList
            :rules="store.currentIR?.expression.strata ?? []"
            :readonly="readonly"
            @add="$emit('strata:add')"
            @edit="(i: number) => $emit('strata:edit', i)"
            @remove="(i: number) => store.removeStratifyRule(i)"
            @move="(f: number, t: number) => store.moveStratifyRule(f, t)"
          />
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel
        v-if="store.currentIR?.id"
        value="past-runs"
        data-testid="ir-rail-panel-past-runs"
      >
        <v-expansion-panel-title>
          <span class="text-eyebrow">{{
            t('components.analysisExecution.buttons.allExecutions', 'Past runs ({submissions})', {
              submissions: store.executions.length,
            }).value
          }}</span>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <IncidenceRatePastRuns
            :runs="store.executions"
            :active-id="activeRunId"
            @select="(id: number) => $emit('select-run', id)"
          />
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import IncidenceRateCohortList from './IncidenceRateCohortList.vue'
import IncidenceRateCohortPicker from './IncidenceRateCohortPicker.vue'
import IncidenceRateTimeAtRiskEditor from './IncidenceRateTimeAtRiskEditor.vue'
import IncidenceRateStudyWindowEditor from './IncidenceRateStudyWindowEditor.vue'
import IncidenceRateStratifyRulesList from './IncidenceRateStratifyRulesList.vue'
import IncidenceRatePastRuns from './IncidenceRatePastRuns.vue'

defineProps<{ activeRunId: number | null }>()
defineEmits<{
  'strata:add': []
  'strata:edit': [index: number]
  'select-run': [id: number]
}>()

const { t } = useI18n()
const store = useIncidenceRateStore()

const openPanels = ref<string[]>(['targets', 'outcomes', 'tar', 'window', 'strata', 'past-runs'])
const openTarget = ref(false)
const openOutcome = ref(false)

const readonly = computed(() => store.isReadOnly || store.isPreviewMode)

const targetCohorts = computed(() =>
  (store.currentIR?.expression.targetIds ?? []).map(id => ({
    id, name: store.cohortNameById.get(id) ?? `Cohort ${id}`,
  }))
)
const outcomeCohorts = computed(() =>
  (store.currentIR?.expression.outcomeIds ?? []).map(id => ({
    id, name: store.cohortNameById.get(id) ?? `Cohort ${id}`,
  }))
)
const strataCount = computed(() => store.currentIR?.expression.strata.length ?? 0)
</script>

<style scoped>
.ir-rail {
  padding: 12px;
  display: flex; flex-direction: column; gap: 8px;
  overflow-y: auto;
}
.ir-rail__panels { background: transparent; }
.ir-rail__panels :deep(.v-expansion-panel) {
  background: transparent !important;
  border-radius: 6px !important;
  margin-bottom: 4px;
}
.ir-rail__panels :deep(.v-expansion-panel-title) {
  padding: 6px 10px;
  min-height: 36px;
  font-size: 12px;
  background: rgba(var(--v-theme-on-surface), 0.02);
}
.ir-rail__panels :deep(.v-expansion-panel-text__wrapper) {
  padding: 8px 10px 12px;
}
.ir-rail__count {
  margin-left: 6px;
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
</style>
