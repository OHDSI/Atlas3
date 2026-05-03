<template>
  <AnalysisBuilderShell
    :eyebrow="t('navigation.pathways', 'Pathway analysis').value"
    :title="title"
    :subtitle="subtitle"
    :show-back="true"
    testid="pathway-builder"
    @back="handleBack"
  >
    <template
      v-if="currentPathway"
      #title
    >
      <input
        :value="currentPathway.name"
        :placeholder="t('home.newEntityNames.pathway', 'New pathway').value"
        :aria-label="t('columns.name', 'Name').value"
        :readonly="!canEdit"
        class="pathway-builder__title-input"
        data-testid="pathway-builder-name"
        @input="(e: Event) => store.updateMeta({ name: (e.target as HTMLInputElement).value })"
      >
    </template>
    <template
      v-if="currentPathway"
      #subtitle
    >
      <input
        :value="currentPathway.description ?? ''"
        :placeholder="t('cc.viewEdit.descriptionPlaceholder', 'Add a short description').value"
        :aria-label="t('columns.description', 'Description').value"
        :readonly="!canEdit"
        class="pathway-builder__subtitle-input"
        data-testid="pathway-builder-description"
        @input="(e: Event) => store.updateMeta({ description: (e.target as HTMLInputElement).value })"
      >
    </template>
    <template #actions>
      <AtlasTooltip
        v-if="currentPathway?.id"
        :text="t('cohortDefinitions.cohortDefinitionManager.tabs.versions', 'Versions').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <AtlasIconButton
            v-bind="{ ...tipProps, ariaLabel: 'Versions' }"
            icon="mdi-history"
            variant="text"
            size="sm"
            data-testid="pathway-builder-versions"
            @click="showVersions = true"
          />
        </template>
      </AtlasTooltip>
      <AtlasTooltip
        v-if="currentPathway?.id"
        :text="t('common.tags', 'Tags').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <AtlasBadge
            v-bind="tipProps"
            :content="pathwayTags.length || 0"
            :model-value="pathwayTags.length > 0"
            color="primary"
            offset-x="6"
            offset-y="6"
          >
            <AtlasIconButton
              v-bind="{ ariaLabel: 'Tags' }"
              icon="mdi-tag-outline"
              variant="text"
              size="sm"
              :disabled="isPreviewMode"
              data-testid="pathway-builder-tags"
              @click="showTags = true"
            />
          </AtlasBadge>
        </template>
      </AtlasTooltip>
      <AtlasTooltip
        v-if="previewVersion"
        :text="t('common.backToCurrent', 'Back to current version').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <AtlasIconButton
            v-bind="{ ...tipProps, ariaLabel: 'Back to current version' }"
            icon="mdi-undo"
            variant="text"
            size="sm"
            data-testid="pathway-builder-back-to-current"
            @click="store.clearPreviewVersion()"
          />
        </template>
      </AtlasTooltip>
      <AtlasTooltip
        :text="t('common.import', 'Import design').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <AtlasIconButton
            v-bind="{ ...tipProps, ariaLabel: 'Import design' }"
            icon="mdi-upload"
            variant="text"
            size="sm"
            :loading="importing"
            data-testid="pathway-builder-import"
            @click="handleImportClick"
          />
        </template>
      </AtlasTooltip>
      <AtlasTooltip
        v-if="currentPathway?.id"
        :text="t('common.export', 'Export design').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <AtlasIconButton
            v-bind="{ ...tipProps, ariaLabel: 'Export design' }"
            icon="mdi-download"
            variant="text"
            size="sm"
            :loading="exporting"
            data-testid="pathway-builder-export"
            @click="handleExport"
          />
        </template>
      </AtlasTooltip>
      <input
        ref="importFileInput"
        type="file"
        accept="application/json,.json"
        style="display: none"
        data-testid="pathway-builder-import-input"
        @change="handleImportFileChange"
      >
      <AtlasButton
        v-if="currentPathway?.id"
        variant="secondary"
        icon="mdi-content-copy"
        :disabled="!currentPathway?.id || !canCopy"
        data-testid="pathway-builder-copy"
        @click="onCopy"
      >
        {{ t('common.duplicate', 'Duplicate') }}
      </AtlasButton>
      <v-btn
        v-if="currentPathway?.id"
        variant="outlined"
        color="error"
        prepend-icon="mdi-delete"
        :disabled="!currentPathway?.id || !hasPermission('write:pathway')"
        data-testid="pathway-builder-delete"
        @click="onDelete"
      >
        {{ t('common.delete', 'Delete') }}
      </v-btn>
      <AtlasMenu
        v-if="currentPathway?.id"
        v-model="generateMenu"
        :close-on-content-click="false"
        offset="6"
        location="bottom end"
      >
        <template #activator="{ props: menuProps }">
          <AtlasButton
            v-bind="menuProps"
            variant="secondary"
            icon="mdi-play"
            data-testid="pathway-builder-generate"
          >
            {{ t('components.generation.generate', 'Generate') }}
          </AtlasButton>
        </template>
        <PathwayGeneratePopover
          v-if="currentPathway?.id"
          :pathway-id="currentPathway.id"
          @generated="generateMenu = false"
        />
      </AtlasMenu>
      <v-btn
        color="primary"
        variant="elevated"
        prepend-icon="mdi-content-save"
        :disabled="!canSave"
        data-testid="pathway-builder-save"
        @click="onSave"
      >
        {{ t('common.save', 'Save') }}
      </v-btn>
    </template>

    <template
      v-if="previewVersion"
      #banner
    >
      {{ t('common.savePreviewWarning', 'Previewing version — saving will create a new pathway') }}
    </template>

    <div
      v-if="!currentPathway"
      class="pathway-builder__empty"
    >
      {{ t('common.noData', 'No pathway loaded').value }}
    </div>

    <PathwayWorkbench
      v-else
      :pathway-id="currentPathway?.id ?? null"
      :selected-execution-id="selectedExecutionId"
      @execution:select="id => (selectedExecutionId = id)"
      @open-generate="generateMenu = true"
    />

    <v-dialog
      v-model="showVersions"
      max-width="900"
    >
      <VersionsTabContent
        v-if="versionsConfig"
        :config="versionsConfig"
      />
    </v-dialog>

    <TagSelectionDialog
      v-if="currentPathway?.id"
      v-model="showTags"
      :selected-tags="pathwayTags"
      @update:selected-tags="handleTagsUpdate"
    />

    <AtlasSnackbar
      :model-value="!!feedback"
      :severity="feedbackSeverity"
      :text="feedback?.message ?? ''"
      :timeout="3000"
      @update:model-value="onSnackbarUpdate"
    />
  </AnalysisBuilderShell>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasBadge, AtlasIconButton, AtlasMenu, AtlasSnackbar, AtlasTooltip } from '@/components/ui'
import type { AtlasSnackbarSeverity } from '@/components/ui'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePathwayStore } from '@/stores/pathway'
import { useI18n } from '@/composables/useI18n'
import { usePathwayBuilder } from '@/composables/usePathwayBuilder'
import { usePermissions } from '@/composables/usePermissions'
import AnalysisBuilderShell from '@/components/analysis/AnalysisBuilderShell.vue'
import PathwayWorkbench from './PathwayWorkbench.vue'
import PathwayGeneratePopover from './PathwayGeneratePopover.vue'
import VersionsTabContent from '@/components/versions/VersionsTabContent.vue'
import TagSelectionDialog from '@/components/cohort/TagSelectionDialog.vue'
import { exportPathway, importPathway } from '@/services/webapi'
import { logger } from '@/utils/logger'
import type { VersionsConfig, VersionsTableItem } from '@/components/versions/types'
import type { Tag } from '@/models/webapi.types'

const store = usePathwayStore()
const router = useRouter()
const { currentPathway, previewVersion, isDirty, isPreviewMode, canSave } = storeToRefs(store)
const { save, copy, remove, feedback } = usePathwayBuilder()
const { hasPermission } = usePermissions()
const { t } = useI18n()

const feedbackSeverity = computed<AtlasSnackbarSeverity>(() =>
  feedback.value?.color === 'error' ? 'danger' : (feedback.value?.color ?? 'info')
)

const showVersions = ref(false)
const showTags = ref(false)
const generateMenu = ref(false)
const selectedExecutionId = ref<number | null>(null)
const importing = ref(false)
const exporting = ref(false)
const importFileInput = ref<HTMLInputElement | null>(null)

const canEdit = computed(() => !isPreviewMode.value)
const isDirtyRef = computed(() => isDirty.value)

const pathwayTags = computed(() => currentPathway.value?.tags ?? [])

const title = computed(() => {
  const p = currentPathway.value
  if (!p) return t('navigation.pathways', 'Pathway analysis').value
  return p.name?.trim() || t('home.newEntityNames.pathway', 'New pathway').value
})

const subtitle = computed(() => {
  const p = currentPathway.value
  if (!p) return undefined
  return p.id
    ? `#${p.id}${p.description ? ` · ${p.description}` : ''}`
    : t('home.newEntityNames.pathway', 'New pathway').value
})

// Mirrors the server's @PreAuthorize on POST /pathway-analysis/{id}:
//   (read:pathway OR write:pathway) AND create:pathway
const canCopy = computed(() => {
  const hasRead = hasPermission('read:pathway') || hasPermission('write:pathway')
  return hasRead && hasPermission('create:pathway')
})

function handleBack() {
  router.push('/analysis/pathways')
}

async function handleTagsUpdate(newTags: Tag[]) {
  await store.syncTags(newTags)
}

async function onSave() {
  await save()
}
async function onCopy() {
  await copy()
}
async function onDelete() {
  await remove()
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
  const id = currentPathway.value?.id
  if (!id) return
  exporting.value = true
  try {
    const design = await exportPathway(id)
    triggerDownload(
      `pathway-${slugifyName(currentPathway.value?.name ?? '')}-${id}.json`,
      JSON.stringify(design, null, 2)
    )
  } catch (err) {
    logger.error('PathwayBuilder', 'Export failed', err)
    feedback.value = {
      message: t('characterizations.editor.utilities.import.importError', 'Export failed').value,
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
    logger.error('PathwayBuilder', 'Import parse failed', err)
    feedback.value = {
      message: t(
        'characterizations.editor.utilities.import.parseError',
        'Could not parse design JSON'
      ).value,
      color: 'error',
    }
    importing.value = false
    return
  }

  try {
    const created = await importPathway(parsed)
    feedback.value = {
      message: t('characterizations.editor.utilities.import.importSuccess', 'Imported successfully')
        .value,
      color: 'success',
    }
    if (created.id != null) {
      await router.push(`/pathways/${created.id}`)
    }
  } catch (err) {
    logger.error('PathwayBuilder', 'Import failed', err)
    feedback.value = {
      message: t('characterizations.editor.utilities.import.importError', 'Import failed').value,
      color: 'error',
    }
  } finally {
    importing.value = false
  }
}

function onSnackbarUpdate(open: boolean) {
  if (!open) feedback.value = null
}

const versionsConfig = computed<VersionsConfig | null>(() => {
  const p = currentPathway.value
  if (!p?.id) return null

  const current: VersionsTableItem = {
    version: 0,
    assetId: p.id,
    createdBy: { id: 0, name: (p.createdBy as { name?: string } | undefined)?.name ?? '' },
    createdDate:
      typeof p.createdDate === 'string'
        ? p.createdDate
        : typeof p.createdDate === 'number'
          ? new Date(p.createdDate).toISOString()
          : '',
    comment: null,
    archived: false,
    displayVersion: 'Current',
    isCurrent: true,
    isPreviewing: false,
    formattedDate: '',
  }

  return {
    assetType: 'pathway-analysis',
    assetId: p.id,
    currentVersion: () => current,
    previewVersion,
    canEdit,
    isDirty: isDirtyRef,
    clearPreview: () => store.clearPreviewVersion(),
  }
})

onMounted(() => {
  store.startAutoSave()
})

onBeforeUnmount(() => {
  store.stopAutoSave()
})
</script>

<style scoped>
.pathway-builder__empty {
  padding: 48px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.pathway-builder__title-input {
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
  outline: none;
}
.pathway-builder__title-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.32);
  font-weight: 300;
}
.pathway-builder__title-input:hover:not(:read-only) {
  border-bottom-color: rgba(var(--v-theme-on-surface), 0.16);
}
.pathway-builder__title-input:focus {
  border-bottom-color: rgb(var(--v-theme-orange));
}

.pathway-builder__subtitle-input {
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
  outline: none;
}
.pathway-builder__subtitle-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.32);
}
.pathway-builder__subtitle-input:hover:not(:read-only) {
  border-bottom-color: rgba(var(--v-theme-on-surface), 0.12);
}
.pathway-builder__subtitle-input:focus {
  border-bottom-color: rgb(var(--v-theme-orange));
}
</style>
