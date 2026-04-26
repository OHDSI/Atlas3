<template>
  <v-card
    variant="outlined"
    class="strat-card"
  >
    <v-card-title>
      {{ t('incidenceRate.stratifyRules', 'Stratify Rules') }}
      <v-spacer />
      <v-btn
        size="small"
        @click="addRule"
      >
        {{ t('incidenceRate.addStratifyRule', 'Add rule') }}
      </v-btn>
    </v-card-title>
    <v-card-text class="strat-body">
      <div class="rule-list">
        <div
          v-for="(rule, idx) in rules"
          :key="idx"
          class="rule-item"
          :class="{ active: idx === activeIndex }"
          @click="activeIndex = idx"
        >
          <span class="rule-num">{{ idx + 1 }}.</span>
          <span class="rule-name">{{ rule.name || t('incidenceRate.untitled', 'Untitled rule') }}</span>
          <v-spacer />
          <v-btn
            size="x-small"
            icon="mdi-arrow-up"
            :disabled="idx === 0"
            @click.stop="store.moveStratifyRule(idx, idx - 1)"
          />
          <v-btn
            size="x-small"
            icon="mdi-arrow-down"
            :disabled="idx === rules.length - 1"
            @click.stop="store.moveStratifyRule(idx, idx + 1)"
          />
          <v-btn
            size="x-small"
            icon="mdi-delete"
            color="error"
            @click.stop="onRemove(idx)"
          />
        </div>
        <div
          v-if="rules.length === 0"
          class="empty"
        >
          {{ t('incidenceRate.noStratifyRules', 'No stratify rules yet.') }}
        </div>
      </div>
      <div class="rule-pane">
        <IncidenceRateStratifyRuleEditor
          v-if="activeRule"
          :rule="activeRule"
          @update="(p: Partial<StratifyRule>) => store.updateStratifyRule(activeIndex, p)"
        />
        <div
          v-else
          class="empty pad"
        >
          {{ t('incidenceRate.selectRulePrompt', 'Select a rule to edit, or add one.') }}
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import type { StratifyRule } from '@/models/incidence-rate.types'
import type { CriteriaGroup } from '@/models/cohort.types'
import IncidenceRateStratifyRuleEditor from '@/components/incidence-rate/IncidenceRateStratifyRuleEditor.vue'

const { t } = useI18n()
const store = useIncidenceRateStore()

const rules = computed<StratifyRule[]>(() => store.currentIR?.expression.strata ?? [])
const activeIndex = ref(0)
const activeRule = computed<StratifyRule | undefined>(() => rules.value[activeIndex.value])

function emptyGroup(): CriteriaGroup {
  return { id: uuidv4(), logicType: 'ALL', events: [] }
}

function addRule() {
  const newRule: StratifyRule = {
    name: `Rule ${rules.value.length + 1}`,
    description: '',
    expression: emptyGroup(),
  }
  store.addStratifyRule(newRule)
  activeIndex.value = rules.value.length - 1
}

function onRemove(idx: number) {
  store.removeStratifyRule(idx)
  if (activeIndex.value >= rules.value.length) activeIndex.value = Math.max(0, rules.value.length - 1)
}
</script>

<style scoped>
.strat-card { margin-bottom: 12px; }
.strat-body { display: grid; grid-template-columns: 280px 1fr; gap: 12px; }
.rule-list { border-right: 1px solid #eee; padding-right: 8px; }
.rule-item {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 8px; cursor: pointer; border-radius: 4px;
}
.rule-item.active { background: rgba(25, 118, 210, .08); }
.rule-num { font-weight: 600; }
.rule-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }
.empty { color: #888; padding: 8px; }
.empty.pad { padding: 24px; text-align: center; }
</style>
