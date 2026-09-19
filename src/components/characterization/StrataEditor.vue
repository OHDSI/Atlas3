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

    <v-navigation-drawer
      v-if="drawerOpen"
      v-model="drawerOpen"
      class="strata-editor__drawer"
      location="right"
      temporary
      :width="drawerWidth"
      :scrim="!conceptSetsStore.editorOpen"
      @update:model-value="value => { if (!value) closeDrawer() }"
    >
      <div class="strata-editor__drawer-shell">
        <aside
          class="strata-editor__drawer-rail"
          aria-hidden="true"
        >
          <div class="strata-editor__drawer-rail-text">
            {{ t('cc.viewEdit.design.subgroups.title', 'Subgroup analyses').value }}
          </div>
        </aside>

        <div class="strata-editor__drawer-body">
          <header class="strata-editor__drawer-header">
            <div>
              <p class="strata-editor__drawer-eyebrow">
                {{ t('cc.viewEdit.design.subgroups.title', 'Subgroup analyses').value }}
              </p>
              <h3 class="strata-editor__drawer-title">
                {{ drawerTitle }}
              </h3>
            </div>

            <AtlasButton
              variant="ghost"
              size="sm"
              @click="closeDrawer"
            >
              {{ t('common.close', 'Close').value }}
            </AtlasButton>
          </header>

          <div class="strata-editor__drawer-content">
            <CriteriaGroup
              v-if="drawerOpen"
              :group="editingGroup"
              :concept-sets="conceptSetOptions"
              @select-concept-set="onSelectConceptSet"
              @edit-concept-set="handleCriteriaEditConceptSet"
            />
          </div>

          <footer class="strata-editor__drawer-actions">
            <AtlasButton
              variant="ghost"
              size="sm"
              @click="closeDrawer"
            >
              {{ t('common.close', 'Close').value }}
            </AtlasButton>
          </footer>
        </div>
      </div>
    </v-navigation-drawer>

    <ConceptSetSelectionDialog
      v-model="csPickerOpen"
      :local-concept-sets="localConceptSets"
      @local-concept-set-selected="onLocalConceptSetSelected"
      @concept-set-selected="onConceptSetSelected"
      @create-new="handleCreateNewConceptSet"
    />

    <ConceptSetEditor
      v-if="conceptSetsStore.editorOpen"
      :model-value="conceptSetsStore.editorOpen"
      :concept-set="conceptSetsStore.currentSet"
      embedded
      @update:model-value="onConceptSetEditorVisibilityChange"
      @apply="handleConceptSetApplied"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

import { useI18n } from '@/composables/useI18n'
import { useCirceConceptSetPicker } from '@/composables/useCirceConceptSetPicker'
import { AtlasButton, AtlasChip, AtlasIconButton, AtlasSwitch, AtlasTextField } from '@/components/ui'
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import CriteriaGroup from '@/components/circe/criteria/CriteriaGroup.vue'
import ConceptSetSelectionDialog from '@/components/cohort/ConceptSetSelectionDialog.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { Stratum, CriteriaGroup as CriteriaGroupType } from '@/models/characterization.types'
import type { ConceptSet } from '@/models/circe-types'
import type { ConceptSetItem as AtlasConceptSetItem } from '@/models/concept-set.types'
import { convertAtlasItemToCirce, convertCirceItemToAtlas } from '@/components/cohort-editor/atlas-concept-set'
import { nextConceptSetId } from '@/utils/concept-set-id'
import type { ConceptSetReference } from '@/models/cohort.types'
import type { ConceptSetSelectionTarget } from '@/components/circe/criteria/criteria-editor.types'

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
const conceptSetsStore = useConceptSetsStore()

// ── Drawer state ──────────────────────────────────────────────────────────

const drawerOpen = ref(false)
const editingStratumId = ref<string | null>(null)
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

// Scratch object mutated in-place by CriteriaGroup.vue while the dialog is open.
const editingGroup = ref<CriteriaGroupType>({})

const dialogStratum = computed<Stratum | null>(() => {
  if (!editingStratumId.value) return null
  return props.modelValue.find(s => s.id === editingStratumId.value) ?? null
})

const drawerTitle = computed<string>(() => {
  const stratum = dialogStratum.value
  if (!stratum) return ''
  return stratum.name.trim()
    || tv('cc.viewEdit.design.subgroups.namePlaceholder', 'Subgroup name')
})

// ── Concept-set picker ────────────────────────────────────────────────────

const {
  pickerOpen: csPickerOpen,
  conceptSetOptions,
  onSelectConceptSet,
  onLocalConceptSetSelected,
  onConceptSetSelected,
  hideSelectionDialog,
  cancelSelection,
  resolveSelection,
} = useCirceConceptSetPicker({
  getConceptSets: () => props.strataConceptSets ?? [],
  addConceptSet: (cs) => {
    const next = [...(props.strataConceptSets ?? []), cs]
    emit('update:strataConceptSets', next)
  },
})

const localConceptSets = computed<ConceptSetReference[]>(() =>
  (props.strataConceptSets ?? [])
    .filter((cs): cs is ConceptSet & { id: number } => typeof cs.id === 'number')
    .map(cs => ({ id: cs.id, name: cs.name ?? '', items: cs.expression?.items ?? [] }))
)

// ── Dialog helpers ────────────────────────────────────────────────────────

function openCriteriaDialog(id: string) {
  const stratum = props.modelValue.find(s => s.id === id)
  const existing = stratum?.criteria ?? { Type: 'ALL', CriteriaList: [] }
  // Deep-clone into the scratch ref so CriteriaGroup mutations stay local
  // until the dialog is closed and changes are emitted to the parent.
  editingGroup.value = JSON.parse(JSON.stringify(existing)) as CriteriaGroupType
  editingStratumId.value = id
  drawerOpen.value = true
}

function closeDrawer() {
  const id = editingStratumId.value
  if (id) {
    const next = props.modelValue.map(s =>
      s.id === id ? { ...s, criteria: JSON.parse(JSON.stringify(editingGroup.value)) } : s,
    )
    emit('update:modelValue', next)
  }
  drawerOpen.value = false
  editingStratumId.value = null
}

function onConceptSetEditorVisibilityChange(value: boolean) {
  if (!value) {
    conceptSetsStore.closeEditor()
    cancelSelection()
  }
}

function handleCreateNewConceptSet() {
  hideSelectionDialog()
  conceptSetsStore.openCreateEditor()
}

function handleCriteriaEditConceptSet(target: ConceptSetSelectionTarget | undefined) {
  const conceptSetId = target?.targetRef.value
  if (conceptSetId === undefined || conceptSetId === null) return

  const conceptSet = (props.strataConceptSets ?? []).find(cs => cs.id === conceptSetId)
  if (!conceptSet) {
    throw new Error(`Characterization concept set ${conceptSetId} was not found in strataConceptSets`)
  }

  conceptSetsStore.openEmbeddedEditor({
    id: conceptSet.id!,
    name: conceptSet.name ?? '',
    items: (conceptSet.expression?.items ?? []).map(convertCirceItemToAtlas) as unknown as AtlasConceptSetItem[],
  })
}

function handleConceptSetApplied(set: { id?: number | string; name: string; items?: unknown[] }) {
  const items = JSON.parse(JSON.stringify(set.items ?? [])) as AtlasConceptSetItem[]
  const circeItems = items.map(convertAtlasItemToCirce)
  const existingSets = (props.strataConceptSets ?? []).filter(
    (cs): cs is ConceptSet & { id: number } => typeof cs.id === 'number',
  )
  const finalId = set.id === undefined || set.id === null
    ? nextConceptSetId(existingSets)
    : Number(set.id)

  const conceptSet: ConceptSet = {
    id: finalId,
    name: set.name,
    expression: { items: circeItems },
  }

  const next = props.strataConceptSets ?? []
  const existingIdx = next.findIndex(cs => cs.id === conceptSet.id)
  if (existingIdx !== -1) {
    next[existingIdx] = conceptSet
  } else {
    next.push(conceptSet)
  }

  emit('update:strataConceptSets', next)

  conceptSetsStore.closeEditor()
  resolveSelection(finalId)
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

.strata-editor__drawer-shell {
  display: flex;
  height: 100%;
  min-height: 0;
  background: rgb(var(--v-theme-surface));
}

.strata-editor__drawer-rail {
  width: 52px;
  flex: 0 0 52px;
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: linear-gradient(180deg, rgba(var(--v-theme-primary), 0.12), rgba(var(--v-theme-primary), 0.04));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
}

.strata-editor__drawer-rail-text {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.strata-editor__drawer-body {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  padding: 16px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.strata-editor__drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.strata-editor__drawer-eyebrow {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.strata-editor__drawer-title {
  margin: 2px 0 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.strata-editor__drawer-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.strata-editor__drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
