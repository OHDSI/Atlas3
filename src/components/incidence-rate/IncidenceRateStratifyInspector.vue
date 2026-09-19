<template>
  <v-navigation-drawer
    v-if="rule"
    :model-value="modelValue"
    class="ir-stratify-inspector"
    location="right"
    temporary
    :width="drawerWidth"
    :scrim="!conceptSetsStore.editorOpen"
    @update:model-value="(v: boolean) => $emit('update:modelValue', v)"
  >
    <div class="ir-stratify-inspector__shell">
      <aside
        class="ir-stratify-inspector__rail"
        aria-hidden="true"
      >
        <div class="ir-stratify-inspector__rail-text">
          {{ t('ir.editor.stratifyCriteria', 'Stratify criteria').value }}
        </div>
      </aside>

      <div class="ir-stratify-inspector__body">
        <header class="ir-stratify-inspector__header">
          <div>
            <p class="ir-stratify-inspector__eyebrow">
              {{ t('navigation.incidenceRates', 'Incidence rate').value }}
            </p>
            <h3 class="ir-stratify-inspector__title">
              {{ rule.name || t('incidenceRate.untitled', 'Untitled rule').value }}
            </h3>
          </div>

          <AtlasButton
            variant="ghost"
            size="sm"
            @click="$emit('update:modelValue', false)"
          >
            {{ t('common.close', 'Close').value }}
          </AtlasButton>
        </header>

        <div class="ir-stratify-inspector__content">
          <IncidenceRateStratifyRuleEditor
            :rule="rule"
            :concept-sets="conceptSets"
            @update="(p: Partial<StratifyRule>) => $emit('update', p)"
            @add-concept-set="(cs) => $emit('add-concept-set', cs)"
          />
        </div>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { AtlasButton } from '@/components/ui'
import IncidenceRateStratifyRuleEditor from '@/components/incidence-rate/IncidenceRateStratifyRuleEditor.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { StratifyRule } from '@/models/incidence-rate.types'
import type { ConceptSet } from '@/models/circe-types'

defineProps<{
  modelValue: boolean
  rule: StratifyRule | null
  conceptSets: ConceptSet[]
}>()
defineEmits<{
  'update:modelValue': [v: boolean]
  update: [partial: Partial<StratifyRule>]
  'add-concept-set': [cs: ConceptSet]
}>()
const { t } = useI18n()
const conceptSetsStore = useConceptSetsStore()

const drawerWidth = ref<number>(0)

function updateDrawerWidth() {
  drawerWidth.value = Math.max(500, Math.floor(window.innerWidth * 0.95))
}

onMounted(() => {
  updateDrawerWidth()
  window.addEventListener('resize', updateDrawerWidth)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateDrawerWidth)
})
</script>

<style scoped>
.ir-stratify-inspector {
  z-index: 2200;
}

.ir-stratify-inspector__shell {
  display: flex;
  flex-direction: row;
  height: 100%;
  min-height: 0;
  background: rgb(var(--v-theme-surface));
}

.ir-stratify-inspector__rail {
  width: 52px;
  flex: 0 0 52px;
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: linear-gradient(
    180deg,
    rgba(var(--v-theme-primary), 0.12),
    rgba(var(--v-theme-primary), 0.04)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
}

.ir-stratify-inspector__rail-text {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.ir-stratify-inspector__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.ir-stratify-inspector__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 28px 14px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.ir-stratify-inspector__eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.ir-stratify-inspector__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.ir-stratify-inspector__content {
  flex: 1;
  min-height: 0;
  flex: 1;
  overflow: auto;
}
</style>
