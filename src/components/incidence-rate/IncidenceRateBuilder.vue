<template>
  <AnalysisBuilderShell
    :title="title"
    :subtitle="subtitle"
    :show-back="true"
    testid="ir-builder"
    @back="handleBack"
  >
    <template #actions>
      <v-tooltip
        :text="t('ir.tabs.conceptSets', 'Concept Sets').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <v-btn
            v-bind="tipProps"
            icon="mdi-bookmark-multiple-outline"
            variant="text"
            size="small"
            density="compact"
            data-testid="ir-builder-conceptsets-icon"
            @click="showConceptSetsDialog = true"
          />
        </template>
      </v-tooltip>
      <v-tooltip
        v-if="store.currentIR?.id"
        :text="t('ir.tabs.versions', 'Versions').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <v-btn
            v-bind="tipProps"
            icon="mdi-history"
            variant="text"
            size="small"
            density="compact"
            data-testid="ir-builder-versions-icon"
            @click="showVersionsDialog = true"
          />
        </template>
      </v-tooltip>
      <v-tooltip
        v-if="store.currentIR?.id"
        :text="t('common.tags', 'Tags').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <v-badge
            v-bind="tipProps"
            :content="irTags.length || 0"
            :model-value="irTags.length > 0"
            color="primary"
            offset-x="6"
            offset-y="6"
          >
            <v-btn
              icon="mdi-tag-outline"
              variant="text"
              size="small"
              density="compact"
              :disabled="store.isPreviewMode"
              data-testid="ir-builder-tags-icon"
              @click="showTagsDialog = true"
            />
          </v-badge>
        </template>
      </v-tooltip>
      <v-tooltip
        :text="t('common.import', 'Import design').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <v-btn
            v-bind="tipProps"
            icon="mdi-upload"
            variant="text"
            size="small"
            density="compact"
            :loading="importing"
            data-testid="ir-builder-import-icon"
            @click="handleImportClick"
          />
        </template>
      </v-tooltip>
      <v-tooltip
        v-if="store.currentIR?.id"
        :text="t('common.export', 'Export design').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <v-btn
            v-bind="tipProps"
            icon="mdi-download"
            variant="text"
            size="small"
            density="compact"
            :loading="exporting"
            data-testid="ir-builder-export-icon"
            @click="handleExport"
          />
        </template>
      </v-tooltip>
      <input
        ref="importFileInput"
        type="file"
        accept="application/json,.json"
        style="display: none"
        data-testid="ir-builder-import-input"
        @change="handleImportFileChange"
      >
      <v-tooltip
        v-if="store.isPreviewMode"
        :text="t('common.backToCurrent', 'Back to current version').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <v-btn
            v-bind="tipProps"
            icon="mdi-undo"
            variant="text"
            size="small"
            density="compact"
            data-testid="ir-builder-back-to-current"
            @click="store.clearPreviewVersion()"
          />
        </template>
      </v-tooltip>
      <v-btn
        v-if="store.currentIR?.id"
        variant="outlined"
        prepend-icon="mdi-content-copy"
        :disabled="!store.currentIR?.id || !canCopy"
        data-testid="ir-builder-copy"
        @click="onCopy"
      >
        {{ t('common.duplicate', 'Duplicate') }}
      </v-btn>
      <v-btn
        v-if="store.currentIR?.id"
        variant="outlined"
        color="error"
        prepend-icon="mdi-delete"
        :disabled="!store.currentIR?.id || !canDelete"
        data-testid="ir-builder-delete"
        @click="askDelete = true"
      >
        {{ t('common.delete', 'Delete') }}
      </v-btn>
      <v-btn
        color="primary"
        variant="elevated"
        prepend-icon="mdi-content-save"
        :disabled="!store.canSave || saving || !canSave"
        :loading="saving"
        data-testid="ir-builder-save"
        @click="onSave"
      >
        {{ t('common.save', 'Save') }}
      </v-btn>
    </template>

    <div class="ir-builder">
      <v-text-field
        :model-value="store.currentIR?.name ?? ''"
        :label="t('columns.name', 'Name').value"
        density="compact"
        variant="outlined"
        hide-details
        class="ir-builder__name-field"
        :readonly="store.isReadOnly || store.isPreviewMode"
        @update:model-value="(v: string) => store.updateMeta({ name: v })"
      />

      <IncidenceRateDefinitionPanel />

      <section
        v-if="store.currentIR?.id"
        class="ir-builder__generation-section"
      >
        <header class="ir-builder__section-header">
          <span class="text-eyebrow">{{ t('ir.tabs.generation', 'Generation').value }}</span>
          <span class="ir-builder__section-rule" />
        </header>
        <IncidenceRateGenerationPanel :ir-id="store.currentIR.id" />
      </section>
    </div>

    <v-dialog
      v-model="showConceptSetsDialog"
      max-width="1200"
      scrollable
    >
      <v-card>
        <AppDialogHeader
          :eyebrow="t('navigation.incidenceRates', 'Incidence rate').value"
          :title="t('ir.tabs.conceptSets', 'Concept Sets').value"
          :show-close="true"
          :close-label="t('common.close', 'Close').value"
          @close="showConceptSetsDialog = false"
        />
        <v-card-text class="pa-4">
          <IncidenceRateConceptSetsPanel data-testid="ir-builder-conceptsets-panel" />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="showVersionsDialog"
      max-width="1000"
      scrollable
    >
      <v-card>
        <AppDialogHeader
          :eyebrow="t('navigation.incidenceRates', 'Incidence rate').value"
          :title="t('ir.tabs.versions', 'Versions').value"
          :show-close="true"
          :close-label="t('common.close', 'Close').value"
          @close="showVersionsDialog = false"
        />
        <v-card-text class="pa-4">
          <IncidenceRateVersionsPanel
            v-if="store.currentIR?.id"
            :ir-id="store.currentIR.id"
            data-testid="ir-builder-versions-panel"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <TagSelectionDialog
      v-if="store.currentIR?.id"
      v-model="showTagsDialog"
      :selected-tags="irTags"
      @update:selected-tags="handleTagsUpdate"
    />

    <v-dialog
      v-model="askDelete"
      max-width="400"
    >
      <v-card>
        <v-card-title>{{ t('common.delete', 'Delete incidence rate') }}</v-card-title>
        <v-card-text>{{ t('ir.deleteConfirmation', 'Delete incidence rate analysis? Warning: deletion can not be undone!') }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="askDelete = false">
            {{ t('common.cancel', 'Cancel') }}
          </v-btn>
          <v-btn
            color="error"
            @click="onDelete"
          >
            {{ t('common.delete', 'Delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      :model-value="!!feedback"
      :color="feedback?.color ?? 'info'"
      :timeout="3000"
      @update:model-value="(open: boolean) => { if (!open) feedback = null }"
    >
      {{ feedback?.message }}
    </v-snackbar>
  </AnalysisBuilderShell>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { useIncidenceRateBuilder } from '@/composables/useIncidenceRateBuilder'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccess } from '@/composables/useEntityAccess'
import AnalysisBuilderShell from '@/components/analysis/AnalysisBuilderShell.vue'
import AppDialogHeader from '@/components/shared/AppDialogHeader.vue'
import IncidenceRateDefinitionPanel from '@/components/incidence-rate/IncidenceRateDefinitionPanel.vue'
import IncidenceRateConceptSetsPanel from '@/components/incidence-rate/IncidenceRateConceptSetsPanel.vue'
import IncidenceRateGenerationPanel from '@/components/incidence-rate/IncidenceRateGenerationPanel.vue'
import IncidenceRateVersionsPanel from '@/components/incidence-rate/IncidenceRateVersionsPanel.vue'
import TagSelectionDialog from '@/components/cohort/TagSelectionDialog.vue'
import { exportIncidenceRate, importIncidenceRate } from '@/services/webapi'
import { logger } from '@/utils/logger'
import type { Tag } from '@/models/webapi.types'

const { t } = useI18n()
const store = useIncidenceRateStore()
const router = useRouter()
const { save, copy, remove, feedback } = useIncidenceRateBuilder()
const saving = ref(false)
const askDelete = ref(false)
const showConceptSetsDialog = ref(false)
const showVersionsDialog = ref(false)
const showTagsDialog = ref(false)
const importing = ref(false)
const exporting = ref(false)
const importFileInput = ref<HTMLInputElement | null>(null)

const irTags = computed<Tag[]>(() => store.currentIR?.tags ?? [])

async function handleTagsUpdate(newTags: Tag[]) {
  await store.syncTags(newTags)
}

function slugifyName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'design'
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
    triggerDownload(`incidence-rate-${slugifyName(store.currentIR?.name ?? '')}-${id}.json`, JSON.stringify(design, null, 2))
  } catch (err) {
    logger.error('IRBuilder', 'Export failed', err)
    feedback.value = { message: t('characterizations.editor.utilities.import.importError', 'Export failed').value, color: 'error' }
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
    feedback.value = { message: t('characterizations.editor.utilities.import.parseError', 'Could not parse design JSON').value, color: 'error' }
    importing.value = false
    return
  }

  try {
    const created = await importIncidenceRate(parsed)
    feedback.value = { message: t('characterizations.editor.utilities.import.importSuccess', 'Imported successfully').value, color: 'success' }
    if (created.id != null) {
      await router.push(`/incidence-rates/${created.id}`)
    }
  } catch (err) {
    logger.error('IRBuilder', 'Import failed', err)
    feedback.value = { message: t('characterizations.editor.utilities.import.importError', 'Import failed').value, color: 'error' }
  } finally {
    importing.value = false
  }
}

const irId = computed<number | null>(() => store.currentIR?.id ?? null)
const { hasPermission } = usePermissions()
const { canWrite, canDelete } = useEntityAccess('incidenceRate', irId)
const canCopy = computed<boolean>(() => hasPermission('create:incidence'))
const canSave = computed<boolean>(() =>
  irId.value === null ? hasPermission('create:incidence') : canWrite.value,
)

const title = computed(() => {
  const ir = store.currentIR
  if (!ir) return t('navigation.incidenceRates', 'Incidence rate analysis').value
  return ir.name?.trim() || t('home.newEntityNames.incidenceRate', 'New incidence rate').value
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
  try { await save() } finally { saving.value = false }
}
async function onCopy() { await copy() }
async function onDelete() { askDelete.value = false; await remove() }
</script>

<style scoped>
.ir-builder {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ir-builder__name-field {
  max-width: 480px;
}

.ir-builder__generation-section {
  margin-top: 16px;
}

.ir-builder__section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.ir-builder__section-rule {
  flex: 1;
  height: 1px;
  background-color: rgba(var(--v-theme-on-surface), 0.08);
}
</style>
