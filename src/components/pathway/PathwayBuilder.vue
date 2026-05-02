<template>
  <AnalysisBuilderShell
    :title="title"
    :subtitle="subtitle"
    :show-back="true"
    testid="pathway-builder"
    @back="handleBack"
  >
    <template #actions>
      <v-tooltip
        v-if="currentPathway?.id"
        :text="t('cohortDefinitions.cohortDefinitionManager.tabs.versions', 'Versions').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <v-btn
            v-bind="tipProps"
            icon="mdi-history"
            variant="text"
            size="small"
            density="comfortable"
            data-testid="pathway-builder-versions"
            @click="showVersions = true"
          />
        </template>
      </v-tooltip>
      <v-tooltip
        v-if="currentPathway?.id"
        :text="t('common.tags', 'Tags').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <v-badge
            v-bind="tipProps"
            :content="pathwayTags.length || 0"
            :model-value="pathwayTags.length > 0"
            color="primary"
            offset-x="6"
            offset-y="6"
          >
            <v-btn
              icon="mdi-tag-outline"
              variant="text"
              size="small"
              density="comfortable"
              :disabled="isPreviewMode"
              data-testid="pathway-builder-tags"
              @click="showTags = true"
            />
          </v-badge>
        </template>
      </v-tooltip>
      <v-tooltip
        v-if="currentPathway?.id"
        :text="t('common.export', 'Export').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <v-btn
            v-bind="tipProps"
            icon="mdi-download"
            variant="text"
            size="small"
            density="comfortable"
            :disabled="!selectedExecutionId"
            data-testid="pathway-builder-export"
            @click="onExport"
          />
        </template>
      </v-tooltip>
      <v-btn
        v-if="currentPathway?.id"
        variant="outlined"
        prepend-icon="mdi-content-copy"
        :disabled="!currentPathway?.id || !canCopy"
        data-testid="pathway-builder-copy"
        @click="onCopy"
      >
        {{ t('common.copy', 'Copy') }}
      </v-btn>
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
      <v-menu
        v-if="currentPathway?.id"
        v-model="generateMenu"
        :close-on-content-click="false"
        offset="6"
        location="bottom end"
      >
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            color="primary"
            variant="outlined"
            prepend-icon="mdi-play"
            data-testid="pathway-builder-generate"
          >
            {{ t('components.generation.generate', 'Generate') }}
          </v-btn>
        </template>
        <PathwayGeneratePopover
          v-if="currentPathway?.id"
          :pathway-id="currentPathway.id"
          @generated="generateMenu = false"
        />
      </v-menu>
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
      @execution:select="(id) => (selectedExecutionId = id)"
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

    <v-snackbar
      :model-value="!!feedback"
      :color="feedback?.color ?? 'info'"
      :timeout="3000"
      @update:model-value="onSnackbarUpdate"
    >
      {{ feedback?.message }}
    </v-snackbar>
  </AnalysisBuilderShell>
</template>

<script setup lang="ts">
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
import type { VersionsConfig, VersionsTableItem } from '@/components/versions/types'
import type { Tag } from '@/models/webapi.types'

const store = usePathwayStore()
const router = useRouter()
const { currentPathway, previewVersion, isDirty, isPreviewMode, canSave } = storeToRefs(store)
const { save, copy, remove, feedback } = usePathwayBuilder()
const { hasPermission } = usePermissions()
const { t } = useI18n()

const showVersions = ref(false)
const showTags = ref(false)
const generateMenu = ref(false)
const selectedExecutionId = ref<number | null>(null)

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

async function onSave() { await save() }
async function onCopy() { await copy() }
async function onDelete() { await remove() }
function onExport() {
  // Export wiring lands in a follow-up; the toolbar/header surface the intent.
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
    createdDate: typeof p.createdDate === 'string'
      ? p.createdDate
      : (typeof p.createdDate === 'number' ? new Date(p.createdDate).toISOString() : ''),
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
</style>
