<!--
  StrataEditor — labelled "Subgroup analyses" in the UI to match Atlas 2.15
  terminology.

  Per-subgroup criteria editing happens in a wide dialog because the
  CriteriaGroup is too dense for the 280px rail. Concept-set selection uses
  the circe-native useCirceConceptSetPicker composable; definitions are stored
  in strataConceptSets at the CharacterizationDefinition level.
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
      @close="onDialogClose"
    >
      <CriteriaGroup
        v-if="dialogOpen"
        :group="editingGroup"
        :concept-sets="conceptSetOptions"
        @select-concept-set="onSelectConceptSet"
        @edit-concept-set="onSelectConceptSet"
      />
      <template #actions>
        <AtlasButton
          variant="ghost"
          size="sm"
          @click="onDialogClose"
        >
          {{ t('common.close', 'Close').value }}
        </AtlasButton>
      </template>
    </AtlasDialog>

    <ConceptSetSelectionDialog
      v-model="csDialogOpen"
      @concept-set-selected="onConceptSetSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, toRaw } from 'vue'

import { useI18n } from '@/composables/useI18n'
import { useCirceConceptSetPicker } from '@/composables/useCirceConceptSetPicker'
import { AtlasButton, AtlasChip, AtlasDialog, AtlasIconButton, AtlasSwitch, AtlasTextField } from '@/components/ui'
import CriteriaGroup from '@/components/cohort-editor/criteria/CriteriaGroup.vue'
import ConceptSetSelectionDialog from '@/components/cohort/ConceptSetSelectionDialog.vue'
import type { Stratum, CriteriaGroup as CriteriaGroupType } from '@/models/characterization.types'
import type { ConceptSet } from '@/components/cohort-editor/circe.types'

const props = defineProps<{
  modelValue: Stratum[]
  strataOnly?: boolean
  strataConceptSets?: ConceptSet[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Stratum[]]
  'update:strataOnly': [value: boolean]
  'update:strataConceptSets': [value: ConceptSet[]]
}>()

const { t, tv } = useI18n()

// ── Dialog state ──────────────────────────────────────────────────────────

const dialogOpen = ref(false)
const editingStratumId = ref<string | null>(null)

// Reactive object mutated in-place by CriteriaGroup.vue.
const editingGroup = reactive<CriteriaGroupType>({})

const dialogStratum = computed<Stratum | null>(() => {
  if (!editingStratumId.value) return null
  return props.modelValue.find(s => s.id === editingStratumId.value) ?? null
})

const dialogTitle = computed<string>(() => {
  const stratum = dialogStratum.value
  if (!stratum) return ''
  return stratum.name.trim()
    || tv('cc.viewEdit.design.subgroups.namePlaceholder', 'Subgroup name')
})

// ── Concept-set picker ────────────────────────────────────────────────────

const { dialogOpen: csDialogOpen, conceptSetOptions, onSelectConceptSet, onConceptSetSelected } =
  useCirceConceptSetPicker({
    getConceptSets: () => props.strataConceptSets ?? [],
    addConceptSet: (cs) => {
      const next = [...(props.strataConceptSets ?? []), cs]
      emit('update:strataConceptSets', next)
    },
  })

// ── Dialog helpers ────────────────────────────────────────────────────────

function openCriteriaDialog(id: string) {
  const stratum = props.modelValue.find(s => s.id === id)
  const existing = stratum?.criteria ?? { Type: 'ALL', CriteriaList: [] }
  // Deep-clone into the reactive object so CriteriaGroup mutations stay local
  // until the dialog is closed and changes are emitted to the parent.
  const cloned = JSON.parse(JSON.stringify(existing)) as CriteriaGroupType
  for (const key of Object.keys(editingGroup)) {
    delete (editingGroup as Record<string, unknown>)[key]
  }
  Object.assign(editingGroup, cloned)
  editingStratumId.value = id
  dialogOpen.value = true
}

function onDialogClose() {
  const id = editingStratumId.value
  if (id) {
    const next = props.modelValue.map(s =>
      s.id === id ? { ...s, criteria: toRaw(editingGroup) } : s,
    )
    emit('update:modelValue', next)
  }
  dialogOpen.value = false
  editingStratumId.value = null
}

// ── Stratum list helpers ──────────────────────────────────────────────────

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
  const c = stratum.criteria
  if (!c || typeof c !== 'object') return false
  const criteriaList = (c as CriteriaGroupType).CriteriaList
  const demoList = (c as CriteriaGroupType).DemographicCriteriaList
  return (
    (Array.isArray(criteriaList) && criteriaList.length > 0) ||
    (Array.isArray(demoList) && demoList.length > 0)
  )
}

function criteriaSummary(stratum: Stratum): string {
  if (!hasCriteria(stratum)) {
    return tv('characterizations.editor.strata.noCriteria', 'No criteria')
  }
  const c = stratum.criteria as CriteriaGroupType
  const n = (c.CriteriaList?.length ?? 0) + (c.DemographicCriteriaList?.length ?? 0)
  return n === 1
    ? tv('characterizations.editor.strata.eventCount', '1 event')
    : tv('characterizations.editor.strata.eventsCount', `${n} events`, {
        n,
      })
}

function emitUpdate(next: Stratum[]) {
  emit('update:modelValue', next)
}

function updateName(index: number, name: string) {
  const next = props.modelValue.map((s, i) => (i === index ? { ...s, name } : s))
  emitUpdate(next)
}

function addStratum() {
  const stratum: Stratum = {
    id: makeUuid(),
    name: '',
    criteria: { Type: 'ALL', CriteriaList: [] },
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
