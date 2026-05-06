<template>
  <div
    v-if="currentPathway"
    class="pathway-design-form"
  >
    <section class="rail-section">
      <header class="rail-section__header">
        <span class="text-eyebrow">{{ t('facets.caption.targetCohorts', 'Target Cohorts').value }}</span>
        <AtlasButton
          variant="ghost"
          size="sm"
          icon="mdi-plus"
          :disabled="readonly"
          @click="showTargetPicker = true"
        >
          {{ t('common.add', 'Add').value }}
        </AtlasButton>
      </header>
      <PathwayCohortList
        :cohorts="targetCohorts"
        :readonly="readonly"
        @rename="(id, name) => store.renameTargetCohort(id, name)"
        @remove="id => store.removeTargetCohort(id)"
      />
      <PathwayCohortPicker
        v-model="showTargetPicker"
        :excluded-ids="targetIds"
        @select="refs => refs.forEach(r => store.addTargetCohort(r))"
      />
    </section>

    <section class="rail-section">
      <header class="rail-section__header">
        <span class="text-eyebrow">{{ t('columns.eventCohort', 'Event Cohorts').value }}</span>
        <AtlasButton
          variant="ghost"
          size="sm"
          icon="mdi-plus"
          :disabled="readonly"
          @click="showEventPicker = true"
        >
          {{ t('common.add', 'Add').value }}
        </AtlasButton>
      </header>
      <PathwayCohortList
        :cohorts="eventCohorts"
        :readonly="readonly"
        @rename="(id, name) => store.renameEventCohort(id, name)"
        @remove="id => store.removeEventCohort(id)"
      />
      <PathwayCohortPicker
        v-model="showEventPicker"
        :excluded-ids="eventIds"
        @select="refs => refs.forEach(r => store.addEventCohort(r))"
      />
    </section>

    <section class="rail-section">
      <header class="rail-section__header">
        <span class="text-eyebrow">{{ t('ple.spec.analysisSettings', 'Settings').value }}</span>
      </header>
      <PathwaySettings
        :model-value="settings"
        :readonly="readonly"
        @update:model-value="d => store.updateDesign(d)"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton } from '@/components/ui'
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePathwayStore } from '@/stores/pathway'
import PathwayCohortList from './PathwayCohortList.vue'
import PathwayCohortPicker from './PathwayCohortPicker.vue'
import PathwaySettings from './PathwaySettings.vue'
import { useI18n } from '@/composables/useI18n'

const store = usePathwayStore()
const { currentPathway, isReadOnly, isPreviewMode } = storeToRefs(store)
const readonly = computed(() => isReadOnly.value || isPreviewMode.value)
const { t } = useI18n()

const showTargetPicker = ref(false)
const showEventPicker = ref(false)

const targetCohorts = computed(() => currentPathway.value?.targetCohorts ?? [])
const eventCohorts = computed(() => currentPathway.value?.eventCohorts ?? [])

const targetIds = computed(() => targetCohorts.value.map(c => c.id))
const eventIds = computed(() => eventCohorts.value.map(c => c.id))

const settings = computed(() => ({
  combinationWindow: currentPathway.value?.combinationWindow ?? 0,
  minCellCount: currentPathway.value?.minCellCount ?? 0,
  maxDepth: currentPathway.value?.maxDepth ?? 0,
  allowRepeats: currentPathway.value?.allowRepeats ?? false,
}))
</script>

<style scoped>
.pathway-design-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
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
.pathway-design-form :deep(.v-field__input),
.pathway-design-form :deep(.v-select__selection-text) {
  font-size: 13px;
  min-height: 32px;
}
.pathway-design-form :deep(.v-field--variant-outlined .v-field__input) {
  padding-top: 4px;
  padding-bottom: 4px;
}
.pathway-design-form :deep(.v-label) {
  font-size: 12px;
  font-weight: 500;
}
.pathway-design-form :deep(.v-list-item-title) {
  font-size: 13px;
  font-weight: 500;
}
</style>
