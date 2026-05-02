<template>
  <div
    v-if="currentPathway"
    class="pathway-design-form"
  >
    <details
      open
      class="pathway-design-form__section"
    >
      <summary class="pathway-design-form__header">
        <span class="text-eyebrow">{{ t('columns.description', 'Description').value }}</span>
        <span class="pathway-design-form__rule" />
      </summary>
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
    </details>

    <details
      open
      class="pathway-design-form__section"
    >
      <summary class="pathway-design-form__header">
        <span class="text-eyebrow">{{ t('facets.caption.targetCohorts', 'Target Cohorts').value }}</span>
        <span class="pathway-design-form__rule" />
        <v-btn
          variant="text"
          size="small"
          prepend-icon="mdi-plus"
          :disabled="readonly"
          @click.prevent.stop="showTargetPicker = true"
        >
          {{ t('common.add', 'Add').value }}
        </v-btn>
      </summary>
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
    </details>

    <details
      open
      class="pathway-design-form__section"
    >
      <summary class="pathway-design-form__header">
        <span class="text-eyebrow">{{ t('columns.eventCohort', 'Event Cohorts').value }}</span>
        <span class="pathway-design-form__rule" />
        <v-btn
          variant="text"
          size="small"
          prepend-icon="mdi-plus"
          :disabled="readonly"
          @click.prevent.stop="showEventPicker = true"
        >
          {{ t('common.add', 'Add').value }}
        </v-btn>
      </summary>
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
    </details>

    <details
      open
      class="pathway-design-form__section"
    >
      <summary class="pathway-design-form__header">
        <span class="text-eyebrow">{{ t('ple.spec.analysisSettings', 'Settings').value }}</span>
        <span class="pathway-design-form__rule" />
      </summary>
      <PathwaySettings
        :model-value="settings"
        :readonly="readonly"
        @update:model-value="(d) => store.updateDesign(d)"
      />
    </details>

    <details
      v-if="pathwayId"
      open
      class="pathway-design-form__section"
    >
      <summary class="pathway-design-form__header">
        <span class="text-eyebrow">{{ t('components.analysisExecution.buttons.allExecutions', 'Past runs ({submissions})', { submissions: pastRuns.length }).value }}</span>
        <span class="pathway-design-form__rule" />
      </summary>
      <PathwayPastRuns
        :runs="pastRuns"
        :active-id="activeRunId ?? null"
        @select="(id) => $emit('execution:select', id)"
      />
    </details>
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
.pathway-design-form__section { margin-bottom: 16px; }
.pathway-design-form__section[open] > summary { margin-bottom: 8px; }
.pathway-design-form__section > summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
}
.pathway-design-form__section > summary::-webkit-details-marker { display: none; }
.pathway-design-form__rule {
  flex: 1;
  height: 1px;
  background-color: rgba(var(--v-theme-on-surface), 0.08);
}
</style>
