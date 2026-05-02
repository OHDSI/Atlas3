<!--
  StrataEditor — labelled "Subgroup analyses" in the UI to match Atlas 2.15
  terminology.

  Per-subgroup criteria editing happens in a wide dialog (`CriteriaGroupEditor`
  is too dense for the 280px rail). The card shows a name, a status chip
  ("configured" / "empty"), and an Edit Criteria action.
-->
<template>
  <div class="strata-editor">
    <div class="strata-editor__header">
      <h2 class="strata-editor__title">
        {{ t('cc.viewEdit.design.subgroups.title', 'Subgroup analyses').value }}
      </h2>
      <v-btn
        variant="outlined"
        color="primary"
        size="small"
        density="compact"
        prepend-icon="mdi-plus"
        data-testid="strata-editor-add"
        @click="addStratum"
      >
        {{ t('cc.viewEdit.design.subgroups.newSubgroup', 'New subgroup').value }}
      </v-btn>
    </div>

    <div
      v-if="modelValue.length === 0"
      class="strata-editor__empty"
      data-testid="strata-editor-empty"
    >
      {{ t('cc.viewEdit.design.subgroups.noSubgroups', 'No subgroups defined').value }}
    </div>

    <v-switch
      v-if="modelValue.length > 0"
      :model-value="strataOnly"
      :label="
        t('cc.viewEdit.design.subgroups.subgroupOnly', 'Calculate subgroup analyses only').value
      "
      density="compact"
      color="primary"
      hide-details
      data-testid="strata-editor-only"
      @update:model-value="(v: boolean | null) => $emit('update:strataOnly', !!v)"
    />

    <div
      v-for="(stratum, index) in modelValue"
      :key="stratum.id"
      class="strata-editor__card"
      :data-testid="`strata-editor-card-${index}`"
    >
      <div class="strata-editor__card-header">
        <v-text-field
          :model-value="stratum.name"
          :label="
            t('cc.viewEdit.design.subgroups.namePlaceholder', 'Subgroup name').value
          "
          :error="!stratum.name.trim() || isDuplicate(stratum.name)"
          :error-messages="nameErrors(stratum.name)"
          density="compact"
          variant="outlined"
          hide-details="auto"
          class="strata-editor__name"
          :data-testid="`strata-editor-name-${index}`"
          @update:model-value="(value: string) => updateName(index, value)"
        />
        <v-btn
          icon="mdi-delete"
          size="small"
          variant="text"
          color="error"
          :aria-label="t('columns.remove', 'Remove').value"
          :data-testid="`strata-editor-remove-${index}`"
          @click="removeStratum(index)"
        />
      </div>
      <div class="strata-editor__criteria-row">
        <v-chip
          size="x-small"
          :color="hasCriteria(stratum) ? 'primary' : undefined"
          :variant="hasCriteria(stratum) ? 'tonal' : 'outlined'"
          class="strata-editor__criteria-chip"
        >
          {{ criteriaSummary(stratum) }}
        </v-chip>
        <v-btn
          size="x-small"
          variant="text"
          density="compact"
          prepend-icon="mdi-pencil-outline"
          :data-testid="`strata-editor-edit-criteria-${index}`"
          @click="openCriteriaDialog(stratum.id)"
        >
          {{ t('common.edit', 'Edit criteria').value }}
        </v-btn>
      </div>
    </div>

    <v-dialog
      v-model="dialogOpen"
      max-width="1100"
      scrollable
      :persistent="true"
    >
      <v-card>
        <AppDialogHeader
          :eyebrow="t('cc.viewEdit.design.subgroups.title', 'Subgroup analyses').value"
          :title="dialogTitle"
          :show-close="true"
          :close-label="t('common.close', 'Close').value"
          @close="dialogOpen = false"
        />
        <v-card-text class="strata-editor__dialog-body">
          <CriteriaGroupEditor
            v-if="dialogStratum"
            :model-value="dialogGroup"
            @update:model-value="onDialogGroupUpdate"
          />
        </v-card-text>
        <v-card-actions class="strata-editor__dialog-actions">
          <v-spacer />
          <v-btn
            variant="text"
            size="small"
            density="compact"
            @click="dialogOpen = false"
          >
            {{ t('common.close', 'Close').value }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'

import { useI18n } from '@/composables/useI18n'
import AppDialogHeader from '@/components/shared/AppDialogHeader.vue'
import CriteriaGroupEditor from '@/components/cohort-builder/CriteriaGroupEditor.vue'
import type { Stratum } from '@/models/characterization.types'
import type { CriteriaGroup } from '@/models/cohort.types'

const props = defineProps<{
  modelValue: Stratum[]
  strataOnly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Stratum[]]
  'update:strataOnly': [value: boolean]
}>()

const { t, tv } = useI18n()

const dialogOpen = ref<boolean>(false)
const editingStratumId = ref<string | null>(null)

const dialogStratum = computed<Stratum | null>(() => {
  if (!editingStratumId.value) return null
  return props.modelValue.find(s => s.id === editingStratumId.value) ?? null
})

const dialogGroup = computed<CriteriaGroup>(() => {
  const stratum = dialogStratum.value
  const candidate = stratum?.criteria as CriteriaGroup | undefined
  if (candidate && typeof candidate === 'object' && 'logicType' in candidate) {
    return candidate
  }
  return { id: uuidv4(), logicType: 'ALL', events: [] }
})

const dialogTitle = computed<string>(() => {
  const stratum = dialogStratum.value
  if (!stratum) return ''
  return stratum.name.trim()
    || tv('cc.viewEdit.design.subgroups.namePlaceholder', 'Subgroup name')
})

function makeUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `s-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

const nameCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const s of props.modelValue) {
    const key = s.name.trim()
    if (!key) continue
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
})

function isDuplicate(name: string): boolean {
  const key = name.trim()
  if (!key) return false
  return (nameCounts.value[key] ?? 0) > 1
}

function nameErrors(name: string): string[] {
  if (!name.trim()) {
    return [tv('cc.viewEdit.design.subgroups.messages.nameIsEmpty', 'Subgroup name is empty.')]
  }
  if (isDuplicate(name)) {
    return [
      tv('cc.viewEdit.design.subgroups.messages.nameIsNotUnique', 'Subgroup name is duplicated.'),
    ]
  }
  return []
}

function hasCriteria(stratum: Stratum): boolean {
  const c = stratum.criteria as CriteriaGroup | undefined
  if (!c || typeof c !== 'object') return false
  const events = (c as CriteriaGroup).events
  if (!Array.isArray(events) || events.length === 0) return false
  return true
}

function criteriaSummary(stratum: Stratum): string {
  if (!hasCriteria(stratum)) {
    return tv('characterizations.editor.strata.noCriteria', 'No criteria')
  }
  const events = (stratum.criteria as CriteriaGroup).events
  return tv(
    'characterizations.editor.strata.eventsCount',
    `${events.length} event${events.length === 1 ? '' : 's'}`,
    { n: events.length },
  )
}

function emitUpdate(next: Stratum[]) {
  emit('update:modelValue', next)
}

function updateName(index: number, name: string) {
  const next = props.modelValue.map((s, i) => (i === index ? { ...s, name } : s))
  emitUpdate(next)
}

function openCriteriaDialog(id: string) {
  editingStratumId.value = id
  dialogOpen.value = true
}

function onDialogGroupUpdate(group: CriteriaGroup) {
  if (!editingStratumId.value) return
  const id = editingStratumId.value
  const next = props.modelValue.map(s => (s.id === id ? { ...s, criteria: group } : s))
  emitUpdate(next)
}

function addStratum() {
  const stratum: Stratum = {
    id: makeUuid(),
    name: '',
    criteria: { id: uuidv4(), logicType: 'ALL', events: [] },
  }
  emitUpdate([...props.modelValue, stratum])
}

function removeStratum(index: number) {
  const next = props.modelValue.filter((_, i) => i !== index)
  emitUpdate(next)
}
</script>

<style scoped>
.strata-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.strata-editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.strata-editor__title {
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
}

.strata-editor__empty {
  padding: 8px 0;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-style: italic;
  font-size: 12px;
}

.strata-editor__card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.strata-editor__card-header {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.strata-editor__name {
  flex: 1;
}

.strata-editor__criteria-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.strata-editor__criteria-chip { font-size: 11px; }

.strata-editor__dialog-body {
  padding: 16px 20px;
}

.strata-editor__dialog-actions {
  padding: 8px 16px 12px;
}
</style>
