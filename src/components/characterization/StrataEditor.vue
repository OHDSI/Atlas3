<!--
  StrataEditor — labelled "Subgroup analyses" in the UI to match Atlas 2.15
  terminology.

  Per-subgroup criteria editing happens in a wide dialog because the
  GroupCriteriaUI is too dense for the 280px rail. Concept-set and
  concept pickers are wired directly so the user can pick from existing
  concept sets or search the vocabulary while editing strata criteria.
-->
<template>
  <div class="strata-editor">
    <div class="strata-editor__header">
      <h2 class="strata-editor__title">
        {{ t('cc.viewEdit.design.subgroups.title', 'Subgroup analyses').value }}
      </h2>
      <AtlasButton
        variant="secondary"
        size="sm"
        icon="mdi-plus"
        data-testid="strata-editor-add"
        @click="addStratum"
      >
        {{ t('cc.viewEdit.design.subgroups.newSubgroup', 'New subgroup').value }}
      </AtlasButton>
    </div>

    <div
      v-if="modelValue.length === 0"
      class="strata-editor__empty"
      data-testid="strata-editor-empty"
    >
      {{ t('cc.viewEdit.design.subgroups.noSubgroups', 'No subgroups defined').value }}
    </div>

    <AtlasSwitch
      v-if="modelValue.length > 0"
      :model-value="strataOnly"
      :label="
        t('cc.viewEdit.design.subgroups.subgroupOnly', 'Calculate subgroup analyses only').value
      "
      hide-details
      data-testid="strata-editor-only"
      @update:model-value="(v) => $emit('update:strataOnly', !!v)"
    />

    <div
      v-for="(stratum, index) in modelValue"
      :key="stratum.id"
      class="strata-editor__card"
      :data-testid="`strata-editor-card-${index}`"
    >
      <div class="strata-editor__card-header">
        <AtlasTextField
          :model-value="stratum.name"
          :label="
            t('cc.viewEdit.design.subgroups.namePlaceholder', 'Subgroup name').value
          "
          :error="nameErrors(stratum.name)?.[0]"
          variant="outlined"
          hide-details="auto"
          class="strata-editor__name"
          :data-testid="`strata-editor-name-${index}`"
          @update:model-value="(v) => updateName(index, String(v))"
        />
        <AtlasIconButton
          icon="mdi-delete"
          v-bind="{ ariaLabel: t('columns.remove', 'Remove').value }"
          variant="text"
          tone="danger"
          size="sm"
          :data-testid="`strata-editor-remove-${index}`"
          @click="removeStratum(index)"
        />
      </div>
      <div class="strata-editor__criteria-row">
        <AtlasChip
          size="sm"
          :tone="hasCriteria(stratum) ? 'primary' : 'neutral'"
          :variant="hasCriteria(stratum) ? 'tonal' : 'outlined'"
          class="strata-editor__criteria-chip"
        >
          {{ criteriaSummary(stratum) }}
        </AtlasChip>
        <AtlasButton
          size="sm"
          variant="ghost"
          icon="mdi-pencil-outline"
          :data-testid="`strata-editor-edit-criteria-${index}`"
          @click="openCriteriaDialog(stratum.id)"
        >
          {{ t('common.editCriteria', 'Edit criteria').value }}
        </AtlasButton>
      </div>
    </div>

    <AtlasDialog
      v-model="dialogOpen"
      :eyebrow="t('cc.viewEdit.design.subgroups.title', 'Subgroup analyses').value"
      :title="dialogTitle"
      :close-label="t('common.close', 'Close').value"
      max-width="1100"
      persistent
      @close="dialogOpen = false"
    >
      <GroupCriteriaUI
        v-if="dialogStratum"
        :model-value="dialogGroup"
        @update:model-value="onDialogGroupUpdate"
        @select-concept-set="onSelectConceptSet"
        @select-concept="onSelectConcept"
      />
      <template #actions>
        <AtlasButton
          variant="ghost"
          size="sm"
          @click="dialogOpen = false"
        >
          {{ t('common.close', 'Close').value }}
        </AtlasButton>
      </template>
    </AtlasDialog>

    <ConceptSetSelectionDialog
      v-model="conceptSetDialogOpen"
      @concept-set-selected="onConceptSetSelected"
    />

    <ConceptSearchDialog
      v-model="conceptSearchDialogOpen"
      :domain-filter="conceptSearchDomainFilter"
      @concepts-selected="onConceptsSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'

import { useI18n } from '@/composables/useI18n'
import { useCriteriaGroupPicker } from '@/composables/useCriteriaGroupPicker'
import { AtlasButton, AtlasChip, AtlasDialog, AtlasIconButton, AtlasSwitch, AtlasTextField } from '@/components/ui'
import GroupCriteriaUI from '@/components/cohort-builder/GroupCriteriaUI.vue'
import ConceptSetSelectionDialog from '@/components/cohort/ConceptSetSelectionDialog.vue'
import ConceptSearchDialog from '@/components/cohort/ConceptSearchDialog.vue'
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
  return events.length === 1
    ? tv('characterizations.editor.strata.eventCount', '1 event')
    : tv('characterizations.editor.strata.eventsCount', `${events.length} events`, {
        n: events.length,
      })
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

// Concept-set / concept picking for the embedded GroupCriteriaUI. Shared
// with the incidence-rate stratify editor so nested-child targeting (#93) stays
// correct in one place.
const {
  conceptSetDialogOpen,
  conceptSearchDialogOpen,
  conceptSearchDomainFilter,
  onSelectConceptSet,
  onSelectConcept,
  onConceptSetSelected,
  onConceptsSelected,
} = useCriteriaGroupPicker({
  getGroup: () => dialogGroup.value,
  onUpdate: onDialogGroupUpdate,
})

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

</style>
