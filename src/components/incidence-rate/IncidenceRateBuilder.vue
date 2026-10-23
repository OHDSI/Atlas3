<template>
  <AnalysisBuilderShell
    :eyebrow="t('ir.editor.analysisTitle').value"
    :title="title"
    :subtitle="subtitle"
    :authorship="store.currentIR"
    :show-back="false"
    testid="ir-builder"
    @back="handleBack"
  >
    <template
      v-if="store.currentIR"
      #title
    >
      <input
        :value="store.currentIR.name"
        :placeholder="t('home.newEntityNames.incidenceRate').value"
        :aria-label="t('columns.name').value"
        :readonly="!canEdit"
        class="ir-builder__title-input"
        data-testid="ir-builder-name"
        @input="(e: Event) => store.updateMeta({ name: (e.target as HTMLInputElement).value })"
      >
    </template>
    <template
      v-if="store.currentIR"
      #subtitle
    >
      <input
        :value="store.currentIR.description ?? ''"
        :placeholder="t('cc.viewEdit.descriptionPlaceholder').value"
        :aria-label="t('columns.description').value"
        :readonly="!canEdit"
        class="ir-builder__subtitle-input"
        data-testid="ir-builder-description"
        @input="(e: Event) => store.updateMeta({ description: (e.target as HTMLInputElement).value })"
      >
    </template>
    <template #actions>
      <AtlasActionToolbar>
        <template #status>
          <AtlasTooltip
            :text="t('ir.tabs.conceptSets').value"
            location="bottom"
          >
            <template #activator="{ props: tipProps }">
              <AtlasIconButton
                v-bind="{ ...tipProps, ariaLabel: t('ir.tabs.conceptSets').value }"
                icon="mdi-shape"
                variant="text"
                size="sm"
                data-testid="ir-builder-conceptsets-icon"
                @click="showConceptSetsDialog = true"
              />
            </template>
          </AtlasTooltip>
          <AtlasTooltip
            :text="t('ir.tabs.versions').value"
            location="bottom"
          >
            <template #activator="{ props: tipProps }">
              <AtlasIconButton
                v-bind="{ ...tipProps, ariaLabel: t('ir.tabs.versions').value }"
                icon="mdi-history"
                variant="text"
                size="sm"
                :disabled="!store.currentIR?.id"
                data-testid="ir-builder-versions-icon"
                @click="showVersionsDialog = true"
              />
            </template>
          </AtlasTooltip>
          <AtlasTooltip
            :text="t('common.tags').value"
            location="bottom"
          >
            <template #activator="{ props: tipProps }">
              <AtlasBadge
                v-bind="tipProps"
                :content="irTagCount || 0"
                :model-value="irTagCount > 0"
                color="primary"
                offset-x="6"
                offset-y="6"
                data-testid="ir-builder-tags-badge"
              >
                <AtlasIconButton
                  v-bind="{ ariaLabel: t('common.tags').value }"
                  icon="mdi-tag-outline"
                  variant="text"
                  size="sm"
                  :disabled="!store.currentIR?.id || store.isPreviewMode"
                  data-testid="ir-builder-tags-icon"
                  @click="showTagsDialog = true"
                />
              </AtlasBadge>
            </template>
          </AtlasTooltip>
          <AtlasTooltip
            v-if="store.currentIR?.id"
            :text="t('components.access.configureAccess').value"
            location="bottom"
          >
            <template #activator="{ props }">
              <EntityAccessLockButton
                v-bind="{ ...props, ariaLabel: t('components.access.configureAccess').value }"
                size="sm"
                :disabled="!store.currentIR?.id || store.isPreviewMode"
                data-testid="ir-builder-access-icon"
                @click="showAccessDialog = true"
              />
            </template>
          </AtlasTooltip>
        </template>
        <template #actions>
          <AtlasButton
            variant="ghost"
            size="sm"
            data-testid="ir-builder-cancel"
            @click="handleBack"
          >
            <AtlasIcon class="d-md-none">
              mdi-close
            </AtlasIcon>
            <span class="d-none d-md-inline">{{ t('common.cancel').value }}</span>
          </AtlasButton>
          <AtlasTooltip
            v-if="store.isPreviewMode"
            :text="t('common.backToCurrent').value"
            location="bottom"
          >
            <template #activator="{ props: tipProps }">
              <AtlasIconButton
                v-bind="{ ...tipProps, ariaLabel: t('common.backToCurrent').value }"
                icon="mdi-undo"
                variant="text"
                size="sm"
                data-testid="ir-builder-back-to-current"
                @click="store.clearPreviewVersion()"
              />
            </template>
          </AtlasTooltip>
          <AtlasTooltip
            :text="t('common.importDesign').value"
            location="bottom"
          >
            <template #activator="{ props: tipProps }">
              <AtlasIconButton
                v-bind="{ ...tipProps, ariaLabel: t('common.importDesign').value }"
                icon="mdi-upload"
                variant="text"
                size="sm"
                :loading="importing"
                data-testid="ir-builder-import-icon"
                @click="handleImportClick"
              />
            </template>
          </AtlasTooltip>
          <AtlasTooltip
            :text="t('common.exportDesign').value"
            location="bottom"
          >
            <template #activator="{ props: tipProps }">
              <AtlasIconButton
                v-bind="{ ...tipProps, ariaLabel: t('common.exportDesign').value }"
                icon="mdi-download"
                variant="text"
                size="sm"
                :loading="exporting"
                :disabled="!store.currentIR?.id"
                data-testid="ir-builder-export-icon"
                @click="handleExport"
              />
            </template>
          </AtlasTooltip>
          <input
            ref="importFileInput"
            type="file"
            accept="application/json,.json"
            :aria-label="t('components.incidenceRate.importInputAria').value"
            style="display: none"
            data-testid="ir-builder-import-input"
            @change="handleImportFileChange"
          >
          <DisabledReasonTooltip :reason="saveDisabledReason">
            <AtlasButton
              variant="primary"
              :disabled="!store.canSave || saving || !canSave"
              :loading="saving"
              data-testid="ir-builder-save"
              @click="onSave"
            >
              {{ t('common.save') }}
            </AtlasButton>
          </DisabledReasonTooltip>
        </template>
      </AtlasActionToolbar>
    </template>

    <IncidenceRateWorkbench v-if="store.currentIR" />

    <ConceptSetsListDialog
      v-model="showConceptSetsDialog"
      :concept-sets="incidenceRateConceptSets"
      :used-concept-sets="usedConceptSets"
      @delete="handleDeleteConceptSet"
      @view="handleViewConceptSet"
    >
      <template #actions>
        <AtlasButton
          variant="secondary"
          icon="mdi-plus"
          data-testid="ir-builder-conceptset-create"
          @click="createConceptSet()"
        >
          {{ t('components.conceptSetBuilder.newConceptSet').value }}
        </AtlasButton>
      </template>
    </ConceptSetsListDialog>

    <AtlasDialog
      v-model="showDeleteConceptSetDialog"
      eyebrow="CONCEPT SET"
      :title="t('components.conceptSetDelete.title').value"
      max-width="480"
      @close="cancelDeleteConceptSet"
    >
      {{ deleteConceptSetWarning }}
      <template #actions>
        <AtlasButton
          variant="ghost"
          @click="cancelDeleteConceptSet"
        >
          {{ t('common.cancel').value }}
        </AtlasButton>
        <AtlasButton
          variant="danger"
          data-testid="ir-builder-delete-concept-set-confirm"
          @click="confirmDeleteConceptSet"
        >
          {{ t('common.delete').value }}
        </AtlasButton>
      </template>
    </AtlasDialog>

    <AtlasDialog
      v-model="showVersionsDialog"
      :eyebrow="t('navigation.incidenceRates').value"
      :title="t('ir.tabs.versions').value"
      :close-label="t('common.close').value"
      max-width="1000"
      @close="showVersionsDialog = false"
    >
      <IncidenceRateVersionsPanel
        v-if="store.currentIR?.id"
        :ir-id="store.currentIR.id"
        data-testid="ir-builder-versions-panel"
      />
    </AtlasDialog>

    <TagSelectionDialog
      v-if="store.currentIR?.id"
      v-model="showTagsDialog"
      :selected-tags="irTags"
      :on-apply="handleTagsApply"
    />

    <EntityAccessDialog
      v-if="store.currentIR?.id"
      v-model="showAccessDialog"
      entity-type="INCIDENCE_RATE"
      :entity-id="store.currentIR.id"
      :title="t('components.access.configureAccess').value"
      :subtitle="store.currentIR.name || undefined"
      @close="showAccessDialog = false"
    />

    <ConceptSetEditor
      v-if="conceptSetsStore.editorOpen"
      :model-value="conceptSetsStore.editorOpen"
      :concept-set="conceptSetsStore.currentSet"
      embedded
      @update:model-value="
        value => {
          if (!value) {
            conceptSetsStore.closeEditor()
          }
        }
      "
      @apply="handleConceptSetApplied"
    />

    <AtlasSnackbar
      :model-value="!!feedback"
      :severity="feedbackSeverity"
      :text="feedback?.message ?? ''"
      :timeout="3000"
      @update:model-value="(open: boolean) => { if (!open) feedback = null }"
    />
  </AnalysisBuilderShell>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useIncidenceRateBuilder } from '@/composables/useIncidenceRateBuilder'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccess } from '@/composables/useEntityAccess'
import AnalysisBuilderShell from '@/components/analysis/AnalysisBuilderShell.vue'
import AtlasActionToolbar from '@/components/ui/AtlasActionToolbar.vue'
import { EntityAccessDialog, EntityAccessLockButton } from '@/components/access'
import { AtlasButton, AtlasBadge, AtlasDialog, AtlasIcon, AtlasIconButton, AtlasSnackbar, AtlasTooltip } from '@/components/ui'
import type { AtlasSnackbarSeverity } from '@/components/ui'
import IncidenceRateWorkbench from '@/components/incidence-rate/IncidenceRateWorkbench.vue'
import IncidenceRateVersionsPanel from '@/components/incidence-rate/IncidenceRateVersionsPanel.vue'
import ConceptSetsListDialog from '@/components/cohort/ConceptSetsListDialog.vue'
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import TagSelectionDialog from '@/components/tags/TagSelectionDialog.vue'
import DisabledReasonTooltip from '@/components/shared/DisabledReasonTooltip.vue'
import { resolveSaveDisabledReason } from '@/utils/save-disabled-reason'
import { exportIncidenceRate, importIncidenceRate } from '@/services/incidence-rate.service'
import { logger } from '@/utils/logger'
import { assignedTags } from '@/utils/asset-tags'
import type { ConceptSetReference } from '@/models/cohort.types'
import type { ConceptSet as CirceConceptSet, ConceptSetItem as CirceConceptSetItem, CriteriaGroup as CirceCriteriaGroup } from '@/models/circe-types'
import { circeConceptSetFromAtlas, convertCirceItemToAtlas } from '@/components/cohort-editor/atlas-concept-set'
import { countCriteriaGroupConceptSetReferences, findUsedCriteriaGroupConceptSetIds, unassignCriteriaGroupConceptSetId } from '@/components/cohort-editor/criteria-concept-set-usage'
import type { Tag } from '@/models/webapi.types'

const { t, tv } = useI18n()
const store = useIncidenceRateStore()
const conceptSetsStore = useConceptSetsStore()
const router = useRouter()
const { save, feedback } = useIncidenceRateBuilder()
const feedbackSeverity = computed<AtlasSnackbarSeverity>(() =>
  feedback.value?.color === 'error' ? 'danger' : (feedback.value?.color ?? 'info')
)
const saving = ref(false)
const showConceptSetsDialog = ref(false)
const showVersionsDialog = ref(false)
const showTagsDialog = ref(false)
const showAccessDialog = ref(false)
const importing = ref(false)
const exporting = ref(false)
const importFileInput = ref<HTMLInputElement | null>(null)

const canEdit = computed(() => !store.isPreviewMode && !store.isReadOnly)

const irTags = computed<Tag[]>(() => store.currentIR?.tags ?? [])
const irTagCount = computed(() => assignedTags(irTags.value).length)
const incidenceRateConceptSets = computed<ConceptSetReference[]>(() => {
  const sets = store.currentIR?.expression.ConceptSets ?? []
  return (sets as Array<{ id?: number | string; name?: string; expression?: { items?: CirceConceptSetItem[] } }>).map((set, index) => ({
    id: set.id ?? index,
    name: set.name ?? '',
    items: ((set.expression?.items ?? []) as CirceConceptSetItem[]).map(convertCirceItemToAtlas),
  }))
})
const usedConceptSets = computed<ConceptSetReference[]>(() => {
  const usedIds = findUsedCriteriaGroupConceptSetIds(
    (store.currentIR?.expression.strata ?? []).map(stratum => stratum.expression as CirceCriteriaGroup | undefined)
  )
  return incidenceRateConceptSets.value.filter(conceptSet => typeof conceptSet.id === 'number' && usedIds.has(conceptSet.id))
})

const conceptSetPendingDelete = ref<ConceptSetReference | null>(null)
const conceptSetPendingDeleteUsage = ref(0)
const showDeleteConceptSetDialog = ref(false)

async function handleTagsApply(newTags: Tag[]): Promise<boolean> {
  return store.syncTags(newTags)
}

function createConceptSet() {
  showConceptSetsDialog.value = false
  conceptSetsStore.openCreateEditor()
}

function handleViewConceptSet(set: ConceptSetReference) {
  showConceptSetsDialog.value = false
  conceptSetsStore.openEmbeddedEditor({
    id: set.id,
    name: set.name,
    items: (set.items ?? []) as never[],
  })
}

function handleConceptSetApplied(set: { id?: number | string; name: string; items?: unknown[] }) {
  const currentSets = (store.currentIR?.expression.ConceptSets ?? []) as CirceConceptSet[]
  const updatedSet = circeConceptSetFromAtlas(
    {
      id: set.id,
      name: set.name,
      items: set.items as CirceConceptSetItem[],
    },
    currentSets,
  )

  if (!updatedSet) {
    return
  }

  const next = [...currentSets]
  const existingIndex = next.findIndex(existing => existing.id === updatedSet.id)
  if (existingIndex !== -1) next[existingIndex] = updatedSet
  else next.push(updatedSet)

  if (store.currentIR) {
    store.currentIR.expression.ConceptSets = next
    store.markDirty()
  }

  conceptSetsStore.closeEditor()
  showConceptSetsDialog.value = true
}

function handleDeleteConceptSet(conceptSet: ConceptSetReference) {
  if (typeof conceptSet.id !== 'number') return

  const usage = countCriteriaGroupConceptSetReferences(
    (store.currentIR?.expression.strata ?? []).map(stratum => stratum.expression as CirceCriteriaGroup | undefined),
    conceptSet.id,
  )

  if (usage === 0) {
    deleteConceptSet(conceptSet)
    return
  }

  conceptSetPendingDelete.value = conceptSet
  conceptSetPendingDeleteUsage.value = usage
  showDeleteConceptSetDialog.value = true
}

function confirmDeleteConceptSet() {
  const conceptSet = conceptSetPendingDelete.value
  showDeleteConceptSetDialog.value = false
  conceptSetPendingDelete.value = null
  if (conceptSet) deleteConceptSet(conceptSet)
}

function cancelDeleteConceptSet() {
  showDeleteConceptSetDialog.value = false
  conceptSetPendingDelete.value = null
}

const deleteConceptSetWarning = computed(() => {
  const name = conceptSetPendingDelete.value?.name ?? ''
  const count = conceptSetPendingDeleteUsage.value
  const usage =
    count === 1
      ? t('components.conceptSetDelete.usageOne').value
      : t('components.conceptSetDelete.usageMany', { count }).value

  return t(
    'components.conceptSetDelete.warning',
    { name, usage },
  ).value
})

function deleteConceptSet(conceptSet: ConceptSetReference) {
  if (typeof conceptSet.id !== 'number') return

  const currentSets = (store.currentIR?.expression.ConceptSets ?? []) as Array<{
    id?: number | null
    name?: string | null
    expression?: { items?: CirceConceptSetItem[] }
  }>
  const next = [...currentSets]
  const idx = next.findIndex(cs => cs.id === conceptSet.id)
  if (idx !== -1) next.splice(idx, 1)

  if (store.currentIR) {
    store.currentIR.expression.ConceptSets = next
    unassignCriteriaGroupConceptSetId(
      (store.currentIR.expression.strata ?? []).map(stratum => stratum.expression as CirceCriteriaGroup | undefined),
      conceptSet.id,
    )
    store.markDirty()
  }
}

function slugifyName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'design'
  )
}

function triggerDownload(filename: string, payload: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return
  const blob = new Blob([payload], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function handleExport() {
  const id = store.currentIR?.id
  if (!id) return
  exporting.value = true
  try {
    const design = await exportIncidenceRate(id)
    triggerDownload(
      `incidence-rate-${slugifyName(store.currentIR?.name ?? '')}-${id}.json`,
      JSON.stringify(design, null, 2)
    )
  } catch (err) {
    logger.error('IRBuilder', 'Export failed', err)
    feedback.value = {
      message: t('commonErrors.exportFailed').value,
      color: 'error',
    }
  } finally {
    exporting.value = false
  }
}

function handleImportClick() {
  importFileInput.value?.click()
}

async function handleImportFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return

  importing.value = true
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch (err) {
    logger.error('IRBuilder', 'Import parse failed', err)
    feedback.value = {
      message: t('characterizations.editor.utilities.import.parseError').value,
      color: 'error',
    }
    importing.value = false
    return
  }

  try {
    const created = await importIncidenceRate(parsed)
    feedback.value = {
      message: t('characterizations.editor.utilities.import.importSuccess')
        .value,
      color: 'success',
    }
    if (created.id != null) {
      await router.push(`/incidence-rates/${created.id}`)
    }
  } catch (err) {
    logger.error('IRBuilder', 'Import failed', err)
    feedback.value = {
      message: t('characterizations.editor.utilities.import.importError').value,
      color: 'error',
    }
  } finally {
    importing.value = false
  }
}

const irId = computed<number | null>(() => store.currentIR?.id ?? null)
const { hasPermission } = usePermissions()
const { canWrite } = useEntityAccess('incidenceRate', irId)
const canSave = computed<boolean>(() =>
  irId.value === null ? hasPermission('create:incidence') : canWrite.value
)

const saveDisabledReason = computed<string>(() =>
  resolveSaveDisabledReason({
    entity: tv('const.entityName.incidenceRate'),
    isNew: irId.value === null,
    hasName: !!store.currentIR?.name?.trim(),
    hasPermission: canSave.value,
    isPreviewing: store.isPreviewMode,
    isSaving: saving.value,
    translate: tv,
  })
)

const title = computed(() => {
  const ir = store.currentIR
  if (!ir) return t('ir.editor.analysisTitle').value
  return ir.name?.trim() || t('home.newEntityNames.incidenceRate').value
})

const subtitle = computed(() => {
  const ir = store.currentIR
  if (!ir?.id) return undefined
  return `#${ir.id}${ir.description ? ` · ${ir.description}` : ''}`
})

function handleBack() {
  router.push('/analysis/incidence-rates')
}

async function onSave() {
  saving.value = true
  try {
    await save()
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.ir-builder__title-input {
  width: 100%;
  font-size: 26px;
  font-weight: 300;
  line-height: 1.2;
  letter-spacing: 0.01em;
  color: rgb(var(--v-theme-primary));
  background: transparent;
  border: none;
  border-bottom: 1px dashed transparent;
  padding: 0 0 2px;
  margin: 0;
  font-family: inherit;
}
.ir-builder__title-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.32);
  font-weight: 300;
}
.ir-builder__title-input:hover:not(:read-only) {
  border-bottom-color: rgba(var(--v-theme-on-surface), 0.16);
}
.ir-builder__title-input:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
  border-bottom-color: rgb(var(--v-theme-orange));
}

.ir-builder__subtitle-input {
  width: 100%;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface-variant));
  background: transparent;
  border: none;
  border-bottom: 1px dashed transparent;
  padding: 0 0 2px;
  margin: 0;
  font-family: inherit;
}
.ir-builder__subtitle-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.32);
}
.ir-builder__subtitle-input:hover:not(:read-only) {
  border-bottom-color: rgba(var(--v-theme-on-surface), 0.12);
}
.ir-builder__subtitle-input:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
  border-bottom-color: rgb(var(--v-theme-orange));
}
</style>
