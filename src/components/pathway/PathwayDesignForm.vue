<template>
  <div
    v-if="currentPathway"
    class="pathway-design-form"
  >
    <section>
      <h3>{{ t('columns.description', 'Description') }}</h3>
      <v-text-field
        :model-value="currentPathway.name"
        :label="t('columns.name', 'Name').value"
        :readonly="readonly"
        density="compact"
        @update:model-value="(v: string) => store.updateMeta({ name: v })"
      />
      <v-textarea
        :model-value="currentPathway.description ?? ''"
        :label="t('columns.description', 'Description').value"
        :readonly="readonly"
        density="compact"
        rows="3"
        @update:model-value="(v: string) => store.updateMeta({ description: v })"
      />
    </section>

    <section>
      <h3>{{ t('facets.caption.targetCohorts', 'Target Cohorts') }}</h3>
      <PathwayCohortList
        :cohorts="targetCohorts"
        :readonly="readonly"
        @rename="(id, name) => store.renameTargetCohort(id, name)"
        @remove="(id) => store.removeTargetCohort(id)"
      />
      <v-btn
        :disabled="readonly"
        @click="showTargetPicker = true"
      >
        {{ t('ir.editor.addTargetCohort', 'Add target cohort') }}
      </v-btn>
      <PathwayCohortPicker
        v-model="showTargetPicker"
        :excluded-ids="targetIds"
        @select="(refs) => refs.forEach((r) => store.addTargetCohort(r))"
      />
    </section>

    <section>
      <h3>{{ t('columns.eventCohort', 'Event Cohorts') }}</h3>
      <PathwayCohortList
        :cohorts="eventCohorts"
        :readonly="readonly"
        @rename="(id, name) => store.renameEventCohort(id, name)"
        @remove="(id) => store.removeEventCohort(id)"
      />
      <v-btn
        :disabled="readonly"
        @click="showEventPicker = true"
      >
        {{ t('pathway.addEvent', 'Add event cohort') }}
      </v-btn>
      <PathwayCohortPicker
        v-model="showEventPicker"
        :excluded-ids="eventIds"
        @select="(refs) => refs.forEach((r) => store.addEventCohort(r))"
      />
    </section>

    <section>
      <h3>{{ t('ple.spec.analysisSettings', 'Settings') }}</h3>
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
.pathway-design-form section { margin-bottom: 24px; }
</style>
