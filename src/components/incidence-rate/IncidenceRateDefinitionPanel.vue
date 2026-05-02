<template>
  <div class="def-panel">
    <v-card
      variant="outlined"
      class="meta-card"
    >
      <v-card-text>
        <v-textarea
          :model-value="store.currentIR?.description ?? ''"
          :label="t('columns.description', 'Description').value"
          rows="2"
          auto-grow
          density="compact"
          @update:model-value="(v: string) => store.updateMeta({ description: v })"
        />
      </v-card-text>
    </v-card>

    <div class="cohort-grid">
      <v-card variant="outlined">
        <v-card-title>
          {{ t('ir.editor.targetCohorts', 'Target Cohorts') }}
          <v-spacer />
          <v-btn
            size="small"
            @click="openTarget = true"
          >
            {{ t('common.add', 'Add') }}
          </v-btn>
        </v-card-title>
        <v-card-text>
          <IncidenceRateCohortList
            :cohorts="targetCohorts"
            @remove="(id: number) => store.removeTargetCohortId(id)"
          />
        </v-card-text>
      </v-card>

      <v-card variant="outlined">
        <v-card-title>
          {{ t('ir.editor.outcomeCohorts', 'Outcome Cohorts') }}
          <v-spacer />
          <v-btn
            size="small"
            @click="openOutcome = true"
          >
            {{ t('common.add', 'Add') }}
          </v-btn>
        </v-card-title>
        <v-card-text>
          <IncidenceRateCohortList
            :cohorts="outcomeCohorts"
            @remove="(id: number) => store.removeOutcomeCohortId(id)"
          />
        </v-card-text>
      </v-card>
    </div>

    <IncidenceRateTimeAtRiskEditor />
    <IncidenceRateStudyWindowEditor />
    <IncidenceRateStratifyRules />

    <IncidenceRateCohortPicker
      v-model="openTarget"
      @select="(c: { id: number; name: string }) => store.addTargetCohortId(c.id, c.name)"
    />
    <IncidenceRateCohortPicker
      v-model="openOutcome"
      @select="(c: { id: number; name: string }) => store.addOutcomeCohortId(c.id, c.name)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import IncidenceRateCohortPicker from '@/components/incidence-rate/IncidenceRateCohortPicker.vue'
import IncidenceRateCohortList from '@/components/incidence-rate/IncidenceRateCohortList.vue'
import IncidenceRateTimeAtRiskEditor from '@/components/incidence-rate/IncidenceRateTimeAtRiskEditor.vue'
import IncidenceRateStudyWindowEditor from '@/components/incidence-rate/IncidenceRateStudyWindowEditor.vue'
import IncidenceRateStratifyRules from '@/components/incidence-rate/IncidenceRateStratifyRules.vue'

const { t } = useI18n()
const store = useIncidenceRateStore()
const openTarget = ref(false)
const openOutcome = ref(false)

const targetCohorts = computed(() =>
  (store.currentIR?.expression.targetIds ?? []).map(id => ({
    id,
    name: store.cohortNameById.get(id) ?? `Cohort ${id}`,
  }))
)
const outcomeCohorts = computed(() =>
  (store.currentIR?.expression.outcomeIds ?? []).map(id => ({
    id,
    name: store.cohortNameById.get(id) ?? `Cohort ${id}`,
  }))
)
</script>

<style scoped>
.def-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px;
}
.cohort-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.meta-card {
  margin-bottom: 0;
}
</style>
