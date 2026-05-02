<template>
  <div
    v-if="currentPathway"
    class="pathway-design-form"
  >
    <v-expansion-panels
      v-model="openPanels"
      multiple
      variant="accordion"
      class="pathway-design-form__panels"
    >
      <v-expansion-panel
        value="description"
        class="pathway-design-form__panel"
      >
        <v-expansion-panel-title>
          <span class="text-eyebrow">{{ t('columns.description', 'Description').value }}</span>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
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
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel
        value="targets"
        class="pathway-design-form__panel"
      >
        <v-expansion-panel-title>
          <span class="text-eyebrow">{{ t('facets.caption.targetCohorts', 'Target Cohorts').value }}</span>
          <template #actions="{ expanded }">
            <v-btn
              variant="text"
              size="small"
              density="compact"
              prepend-icon="mdi-plus"
              :disabled="readonly"
              @click.stop="showTargetPicker = true"
            >
              {{ t('common.add', 'Add').value }}
            </v-btn>
            <v-icon>{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </template>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
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
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel
        value="events"
        class="pathway-design-form__panel"
      >
        <v-expansion-panel-title>
          <span class="text-eyebrow">{{ t('columns.eventCohort', 'Event Cohorts').value }}</span>
          <template #actions="{ expanded }">
            <v-btn
              variant="text"
              size="small"
              density="compact"
              prepend-icon="mdi-plus"
              :disabled="readonly"
              @click.stop="showEventPicker = true"
            >
              {{ t('common.add', 'Add').value }}
            </v-btn>
            <v-icon>{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </template>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
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
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel
        value="settings"
        class="pathway-design-form__panel"
      >
        <v-expansion-panel-title>
          <span class="text-eyebrow">{{ t('ple.spec.analysisSettings', 'Settings').value }}</span>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <PathwaySettings
            :model-value="settings"
            :readonly="readonly"
            @update:model-value="(d) => store.updateDesign(d)"
          />
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel
        v-if="pathwayId"
        value="past-runs"
        class="pathway-design-form__panel"
      >
        <v-expansion-panel-title>
          <span class="text-eyebrow">{{ t('components.analysisExecution.buttons.allExecutions', 'Past runs ({submissions})', { submissions: pastRuns.length }).value }}</span>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <PathwayPastRuns
            :runs="pastRuns"
            :active-id="activeRunId ?? null"
            @select="(id) => $emit('execution:select', id)"
          />
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePathwayStore } from '@/stores/pathway'
import PathwayCohortList from './PathwayCohortList.vue'
import PathwayCohortPicker from './PathwayCohortPicker.vue'
import PathwaySettings from './PathwaySettings.vue'
import PathwayPastRuns from './PathwayPastRuns.vue'
import { useI18n } from '@/composables/useI18n'
import { listPathwayExecutions } from '@/services/webapi'
import type { PathwayExecution } from '@/models/pathway.types'

const props = defineProps<{
  pathwayId?: number
  activeRunId?: number | null
}>()

defineEmits<{
  'execution:select': [id: number]
}>()

const store = usePathwayStore()
const { currentPathway, isReadOnly, isPreviewMode } = storeToRefs(store)
const readonly = computed(() => isReadOnly.value || isPreviewMode.value)
const { t } = useI18n()

const showTargetPicker = ref(false)
const showEventPicker = ref(false)
const pastRuns = ref<PathwayExecution[]>([])
const openPanels = ref<string[]>(['description', 'targets', 'events', 'settings', 'past-runs'])

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

async function refreshRuns() {
  if (!props.pathwayId) return
  const r = await listPathwayExecutions(props.pathwayId)
  if (r.success) pastRuns.value = r.data
}

watch(() => props.pathwayId, refreshRuns, { immediate: true })
onMounted(refreshRuns)
</script>

<style scoped>
.pathway-design-form__panels {
  background: transparent;
}
.pathway-design-form__panel {
  background: transparent !important;
  border-radius: 6px !important;
  margin-bottom: 4px;
}
.pathway-design-form__panel :deep(.v-expansion-panel-title) {
  padding: 6px 10px;
  min-height: 36px;
  font-size: 12px;
  background: rgba(var(--v-theme-on-surface), 0.02);
}
.pathway-design-form__panel :deep(.v-expansion-panel-text__wrapper) {
  padding: 8px 10px 12px;
}
</style>
