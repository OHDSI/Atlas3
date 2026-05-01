<template>
  <div
    v-if="currentPathway"
    class="pathway-design-form"
  >
    <section class="pathway-design-form__section">
      <header class="pathway-design-form__header">
        <span class="text-eyebrow">{{ t('columns.description', 'Description').value }}</span>
        <span class="pathway-design-form__rule" />
      </header>
      <v-text-field
        :model-value="currentPathway.name"
        :label="t('columns.name', 'Name').value"
        :readonly="readonly"
        density="compact"
        variant="outlined"
        hide-details
        class="mb-2"
        @update:model-value="(v: string) => store.updateMeta({ name: v })"
      />
      <v-textarea
        :model-value="currentPathway.description ?? ''"
        :label="t('columns.description', 'Description').value"
        :readonly="readonly"
        density="compact"
        variant="outlined"
        hide-details
        rows="2"
        auto-grow
        @update:model-value="(v: string) => store.updateMeta({ description: v })"
      />
    </section>

    <section class="pathway-design-form__section">
      <header class="pathway-design-form__header">
        <span class="text-eyebrow">{{ t('facets.caption.targetCohorts', 'Target Cohorts').value }}</span>
        <span class="pathway-design-form__rule" />
        <v-btn
          variant="text"
          size="small"
          prepend-icon="mdi-plus"
          :disabled="readonly"
          @click="showTargetPicker = true"
        >
          {{ t('common.add', 'Add').value }}
        </v-btn>
      </header>
      <PathwayCohortList
        :cohorts="targetCohorts"
        :readonly="readonly"
        @rename="(id, name) => store.renameTargetCohort(id, name)"
        @remove="(id) => store.removeTargetCohort(id)"
      />
      <PathwayCohortPicker
        v-model="showTargetPicker"
        :excluded-ids="targetIds"
        @select="(refs) => refs.forEach((r) => store.addTargetCohort(r))"
      />
    </section>

    <section class="pathway-design-form__section">
      <header class="pathway-design-form__header">
        <span class="text-eyebrow">{{ t('columns.eventCohort', 'Event Cohorts').value }}</span>
        <span class="pathway-design-form__rule" />
        <v-btn
          variant="text"
          size="small"
          prepend-icon="mdi-plus"
          :disabled="readonly"
          @click="showEventPicker = true"
        >
          {{ t('common.add', 'Add').value }}
        </v-btn>
      </header>
      <PathwayCohortList
        :cohorts="eventCohorts"
        :readonly="readonly"
        @rename="(id, name) => store.renameEventCohort(id, name)"
        @remove="(id) => store.removeEventCohort(id)"
      />
      <PathwayCohortPicker
        v-model="showEventPicker"
        :excluded-ids="eventIds"
        @select="(refs) => refs.forEach((r) => store.addEventCohort(r))"
      />
    </section>

    <section class="pathway-design-form__section">
      <header class="pathway-design-form__header">
        <span class="text-eyebrow">{{ t('ple.spec.analysisSettings', 'Settings').value }}</span>
        <span class="pathway-design-form__rule" />
      </header>
      <PathwaySettings
        :model-value="settings"
        :readonly="readonly"
        @update:model-value="(d) => store.updateDesign(d)"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
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
.pathway-design-form__section {
  margin-bottom: 16px;
}
.pathway-design-form__section:last-child {
  margin-bottom: 0;
}
.pathway-design-form__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.pathway-design-form__rule {
  flex: 1;
  height: 1px;
  background-color: rgba(var(--v-theme-on-surface), 0.08);
}
</style>
