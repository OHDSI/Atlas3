<template>
  <aside
    class="ir-rail"
    data-testid="ir-design-rail"
  >
    <section
      class="rail-section"
      data-testid="ir-rail-panel-targets"
    >
      <header class="rail-section__header">
        <span class="text-eyebrow">{{ t('facets.caption.targetCohorts', 'Target cohorts').value }}</span>
        <AtlasButton
          variant="ghost"
          size="sm"
          icon="mdi-plus"
          :disabled="readonly"
          @click="openTarget = true"
        >
          {{ t('common.add', 'Add').value }}
        </AtlasButton>
      </header>
      <IncidenceRateCohortList
        :cohorts="targetCohorts"
        @remove="(id: number) => store.removeTargetCohortId(id)"
      />
      <IncidenceRateCohortPicker
        v-model="openTarget"
        @select="(c: { id: number; name: string }) => store.addTargetCohortId(c.id, c.name)"
      />
    </section>

    <section
      class="rail-section"
      data-testid="ir-rail-panel-outcomes"
    >
      <header class="rail-section__header">
        <span class="text-eyebrow">{{ t('columns.outcomes', 'Outcome cohorts').value }}</span>
        <AtlasButton
          variant="ghost"
          size="sm"
          icon="mdi-plus"
          :disabled="readonly"
          @click="openOutcome = true"
        >
          {{ t('common.add', 'Add').value }}
        </AtlasButton>
      </header>
      <IncidenceRateCohortList
        :cohorts="outcomeCohorts"
        @remove="(id: number) => store.removeOutcomeCohortId(id)"
      />
      <IncidenceRateCohortPicker
        v-model="openOutcome"
        @select="(c: { id: number; name: string }) => store.addOutcomeCohortId(c.id, c.name)"
      />
    </section>

    <section
      class="rail-section"
      data-testid="ir-rail-panel-tar"
    >
      <header class="rail-section__header">
        <span class="text-eyebrow">{{ t('cohortDefinitions.appearance.timeAtRisk', 'Time at risk').value }}</span>
      </header>
      <IncidenceRateTimeAtRiskEditor />
    </section>

    <section
      class="rail-section"
      data-testid="ir-rail-panel-window"
    >
      <header class="rail-section__header">
        <span class="text-eyebrow">{{ t('incidenceRate.studyWindow', 'Study window').value }}</span>
      </header>
      <IncidenceRateStudyWindowEditor />
    </section>

    <section
      class="rail-section"
      data-testid="ir-rail-panel-strata"
    >
      <header class="rail-section__header">
        <span class="text-eyebrow">{{ t('ir.editor.stratifyCriteria', 'Stratify rules').value }}</span>
        <span class="ir-rail__count">{{ strataCount }}</span>
      </header>
      <IncidenceRateStratifyRulesList
        :rules="store.currentIR?.expression.strata ?? []"
        :readonly="readonly"
        @add="$emit('strata:add')"
        @edit="(i: number) => $emit('strata:edit', i)"
        @remove="(i: number) => store.removeStratifyRule(i)"
        @move="(f: number, t: number) => store.moveStratifyRule(f, t)"
      />
    </section>
  </aside>
</template>

<script setup lang="ts">
import { AtlasButton } from '@/components/ui'
import { ref, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import IncidenceRateCohortList from './IncidenceRateCohortList.vue'
import IncidenceRateCohortPicker from './IncidenceRateCohortPicker.vue'
import IncidenceRateTimeAtRiskEditor from './IncidenceRateTimeAtRiskEditor.vue'
import IncidenceRateStudyWindowEditor from './IncidenceRateStudyWindowEditor.vue'
import IncidenceRateStratifyRulesList from './IncidenceRateStratifyRulesList.vue'

defineEmits<{
  'strata:add': []
  'strata:edit': [index: number]
}>()

const { t } = useI18n()
const store = useIncidenceRateStore()

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
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}
.rail-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rail-section + .rail-section {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding-top: 12px;
}
.rail-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
  gap: 6px;
}
.ir-rail :deep(.v-field__input),
.ir-rail :deep(.v-select__selection-text) {
  font-size: 13px;
  min-height: 32px;
}
.ir-rail :deep(.v-field--variant-outlined .v-field__input) {
  padding-top: 4px;
  padding-bottom: 4px;
}
.ir-rail :deep(.v-label) {
  font-size: 12px;
  font-weight: 500;
}
.ir-rail :deep(.v-list-item-title) {
  font-size: 13px;
  font-weight: 500;
}
.ir-rail__count {
  margin-left: 6px;
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
</style>
