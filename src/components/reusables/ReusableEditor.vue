<template>
  <AnalysisBuilderShell
    :eyebrow="t('navigation.reusables').value"
    :title="title"
    :authorship="current"
    :error="store.error"
    :show-back="false"
    testid="reusable-editor"
  >
    <template #title>
      <input
        :value="current?.name ?? ''"
        :placeholder="t('reusables.newName').value"
        :aria-label="t('columns.name').value"
        :readonly="readonly"
        class="reusable-editor__title-input"
        data-testid="reusable-editor-name"
        @input="onNameInput"
      >
    </template>
    <template
      v-if="current"
      #subtitle
    >
      <textarea
        :value="current.description ?? ''"
        :placeholder="t('cc.viewEdit.descriptionPlaceholder').value"
        :aria-label="t('columns.description').value"
        :readonly="readonly"
        rows="1"
        class="reusable-editor__subtitle-input"
        data-testid="reusable-editor-description"
        @input="onDescriptionInput"
      />
    </template>

    <template #actions>
      <AtlasActionToolbar>
        <template #status>
          <AtlasTooltip
            :text="t('cohortDefinitions.cohortDefinitionManager.tabs.versions').value"
            location="bottom"
          >
            <template #activator="{ props: tipProps }">
              <AtlasIconButton
                v-bind="{ ...tipProps, ariaLabel: t('cohortDefinitions.cohortDefinitionManager.tabs.versions').value }"
                icon="mdi-history"
                variant="text"
                size="sm"
                :disabled="!current?.id"
                data-testid="reusable-editor-versions"
                @click="showVersions = true"
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
                :content="tagCount || 0"
                :model-value="tagCount > 0"
                color="primary"
                offset-x="6"
                offset-y="6"
              >
                <AtlasIconButton
                  v-bind="{ ariaLabel: t('common.tags').value }"
                  icon="mdi-tag-outline"
                  variant="text"
                  size="sm"
                  :disabled="!current?.id || isPreviewMode || !canWrite"
                  data-testid="reusable-editor-tags"
                  @click="showTags = true"
                />
              </AtlasBadge>
            </template>
          </AtlasTooltip>
          <AtlasTooltip
            v-if="current?.id"
            :text="t('components.access.configureAccess').value"
            location="bottom"
          >
            <template #activator="{ props: tipProps }">
              <EntityAccessLockButton
                v-bind="{ ...tipProps, ariaLabel: t('components.access.configureAccess').value }"
                variant="text"
                size="sm"
                :disabled="isPreviewMode || !isOwnerOrAdmin"
                data-testid="reusable-editor-access"
                @click="showAccess = true"
              />
            </template>
          </AtlasTooltip>
          <AtlasMenu>
            <template #activator="{ props: menuProps }">
              <AtlasIconButton
                v-bind="{ ...menuProps, ariaLabel: t('common.menu').value }"
                icon="mdi-dots-vertical"
                variant="text"
                size="sm"
                :disabled="!current?.id || isPreviewMode"
                data-testid="reusable-editor-menu"
              />
            </template>
            <AtlasList
              density="compact"
              min-width="200"
            >
              <AtlasListItem
                prepend-icon="mdi-content-copy"
                :title="t('common.duplicate').value"
                :disabled="!canCreate"
                data-testid="reusable-editor-copy"
                @click="onCopy"
              />
              <AtlasListItem
                prepend-icon="mdi-delete-outline"
                :title="t('common.delete').value"
                :disabled="!canWrite"
                data-testid="reusable-editor-delete"
                @click="showDelete = true"
              />
            </AtlasList>
          </AtlasMenu>
        </template>
        <template #actions>
          <AtlasButton
            variant="ghost"
            size="sm"
            data-testid="reusable-editor-close"
            @click="close"
          >
            {{ t('common.close') }}
          </AtlasButton>
          <AtlasButton
            v-if="isPreviewMode"
            variant="ghost"
            size="sm"
            prepend-icon="mdi-undo"
            data-testid="reusable-editor-back-to-current"
            @click="backToCurrent"
          >
            {{ t('common.backToCurrent') }}
          </AtlasButton>
          <DisabledReasonTooltip :reason="saveDisabledReason">
            <AtlasButton
              variant="primary"
              :disabled="!!saveDisabledReason"
              :loading="store.saving"
              data-testid="reusable-editor-save"
              @click="onSave"
            >
              {{ t('common.save') }}
            </AtlasButton>
          </DisabledReasonTooltip>
        </template>
      </AtlasActionToolbar>
    </template>

    <template
      v-if="isPreviewMode"
      #banner
    >
      {{ t('reusables.previewBanner', { version: previewVersion?.version ?? '' }) }}
    </template>

    <div
      v-if="store.loading"
      class="reusable-editor__empty"
    >
      {{ t('common.loadingWithDots') }}
    </div>
    <ReusableDesignEditor
      v-else-if="current"
      :design="design"
      :readonly="readonly"
    />

    <AtlasDialog
      v-model="showVersions"
      :eyebrow="t('cohortDefinitions.cohortDefinitionManager.tabs.versions').value"
      :title="t('reusables.versionHistory').value"
      max-width="900"
      @close="showVersions = false"
    >
      <VersionsTabContent
        v-if="versionsConfig"
        :config="versionsConfig"
      />
    </AtlasDialog>

    <TagSelectionDialog
      v-if="current?.id"
      v-model="showTags"
      :selected-tags="current.tags ?? []"
      :on-apply="store.syncTags"
    />

    <EntityAccessDialog
      v-if="current?.id"
      v-model="showAccess"
      entity-type="REUSABLE"
      :entity-id="current.id"
      :title="t('components.access.configureAccess').value"
      :subtitle="current.name || undefined"
      @close="showAccess = false"
    />

    <AtlasDialog
      v-model="showDelete"
      eyebrow="CONFIRM"
      :title="t('common.delete').value"
      max-width="480"
      @close="showDelete = false"
    >
      {{ t('reusables.deleteConfirm', { name: current?.name ?? '' }) }}
      <template #actions>
        <AtlasButton
          variant="ghost"
          @click="showDelete = false"
        >
          {{ t('common.cancel') }}
        </AtlasButton>
        <AtlasButton
          variant="danger"
          data-testid="reusable-editor-delete-confirm"
          @click="onDelete"
        >
          {{ t('common.delete') }}
        </AtlasButton>
      </template>
    </AtlasDialog>

    <AtlasDialog
      v-model="showUnsaved"
      :title="t('common.unsavedChanges').value"
      max-width="440"
      @close="cancelLeave"
    >
      {{ t('common.unsavedWarning') }}
      <template #actions>
        <AtlasButton
          variant="ghost"
          @click="cancelLeave"
        >
          {{ t('common.cancel') }}
        </AtlasButton>
        <AtlasButton
          variant="danger"
          data-testid="reusable-editor-discard"
          @click="confirmLeave"
        >
          {{ t('common.discard') }}
        </AtlasButton>
      </template>
    </AtlasDialog>
  </AnalysisBuilderShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  AtlasBadge,
  AtlasButton,
  AtlasDialog,
  AtlasIconButton,
  AtlasList,
  AtlasListItem,
  AtlasMenu,
  AtlasTooltip,
} from '@/components/ui'
import AtlasActionToolbar from '@/components/ui/AtlasActionToolbar.vue'
import AnalysisBuilderShell from '@/components/analysis/AnalysisBuilderShell.vue'
import { EntityAccessDialog, EntityAccessLockButton } from '@/components/access'
import DisabledReasonTooltip from '@/components/shared/DisabledReasonTooltip.vue'
import TagSelectionDialog from '@/components/tags/TagSelectionDialog.vue'
import VersionsTabContent from '@/components/versions/VersionsTabContent.vue'
import type { VersionsConfig, VersionsTableItem } from '@/components/versions/types'
import { useI18n } from '@/composables/useI18n'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccess } from '@/composables/useEntityAccess'
import { useReusableStore } from '@/stores/reusable'
import { useNotifications } from '@/stores/notifications'
import { assignedTags } from '@/utils/asset-tags'
import { resolveSaveDisabledReason } from '@/utils/save-disabled-reason'
import ReusableDesignEditor from './ReusableDesignEditor.vue'

const { t, tv } = useI18n()
const router = useRouter()
const notify = useNotifications()
const store = useReusableStore()
const { current, design, previewVersion, isPreviewMode, isDirty } = storeToRefs(store)
const { hasPermission } = usePermissions()

const canCreate = computed(() => hasPermission('create:reusable'))
const access = useEntityAccess('reusable', () => current.value?.id ?? null)
const canWrite = computed(() => (current.value?.id ? access.canWrite.value : canCreate.value))
const isOwnerOrAdmin = computed(() => access.isOwner.value || hasPermission('admin:security'))
const readonly = computed(() => !canWrite.value || isPreviewMode.value)

const showVersions = ref(false)
const showTags = ref(false)
const showAccess = ref(false)
const showDelete = ref(false)
const showUnsaved = ref(false)

const tagCount = computed(() => assignedTags(current.value?.tags ?? []).length)

const title = computed(() => current.value?.name?.trim() || t('reusables.newName').value)

const saveDisabledReason = computed(() => {
  if (!isDirty.value && current.value?.id) return tv('reusables.noChanges')
  return resolveSaveDisabledReason({
    entity: tv('reusables.entityName'),
    isNew: !current.value?.id,
    hasName: !!current.value?.name?.trim(),
    hasPermission: canWrite.value,
    isPreviewing: isPreviewMode.value,
    hasValidationErrors: false,
    translate: tv,
  })
})

function onNameInput(event: Event) {
  if (current.value) current.value.name = (event.target as HTMLInputElement).value
}

function onDescriptionInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  target.style.height = 'auto'
  target.style.height = `${target.scrollHeight}px`
  if (current.value) current.value.description = target.value
}

async function onSave() {
  const wasNew = !current.value?.id
  const saved = await store.save()
  if (!saved) {
    notify.danger(tv('reusables.saveError'))
    return
  }
  notify.success(tv('reusables.saved'))
  if (wasNew && saved.id) {
    await router.replace(`/reusables/${saved.id}`)
  }
}

async function onCopy() {
  const copy = await store.copy()
  if (!copy?.id) {
    notify.danger(tv('reusables.copyError'))
    return
  }
  await router.push(`/reusables/${copy.id}`)
}

async function onDelete() {
  showDelete.value = false
  if (!(await store.remove())) {
    notify.danger(tv('reusables.deleteError'))
    return
  }
  leaveConfirmed = true
  await router.push('/reusables')
}

async function backToCurrent() {
  const id = current.value?.id
  if (id) await router.push(`/reusables/${id}`)
}

function close() {
  router.push('/reusables')
}

const versionsConfig = computed<VersionsConfig | null>(() => {
  const reusable = current.value
  if (!reusable?.id) return null
  const createdBy = reusable.createdBy
  const currentRow: VersionsTableItem = {
    version: 0,
    assetId: reusable.id,
    createdBy: {
      id: 0,
      name: typeof createdBy === 'string' ? createdBy : (createdBy?.name ?? createdBy?.login ?? ''),
    },
    createdDate:
      typeof reusable.modifiedDate === 'number' || typeof reusable.createdDate === 'number'
        ? new Date((reusable.modifiedDate ?? reusable.createdDate) as number).toISOString()
        : String(reusable.modifiedDate ?? reusable.createdDate ?? ''),
    comment: null,
    archived: false,
    displayVersion: 'Current',
    isCurrent: true,
    isPreviewing: false,
    formattedDate: '',
  }
  return {
    assetType: 'reusable',
    assetId: reusable.id,
    currentVersion: () => currentRow,
    previewVersion,
    canEdit: canWrite,
    isDirty,
    clearPreview: () => store.clearPreviewVersion(),
  }
})

// Unsaved changes: ask before leaving, the same way the other editors do.
let leaveConfirmed = false
let pendingLeave: (() => void) | null = null

onBeforeRouteLeave(to => {
  // Moving between versions of this reusable is not leaving it.
  const sameReusable = current.value?.id && to.path.startsWith(`/reusables/${current.value.id}`)
  if (!isDirty.value || leaveConfirmed || isPreviewMode.value || sameReusable) {
    leaveConfirmed = false
    return true
  }
  pendingLeave = () => {
    leaveConfirmed = true
    router.push(to.fullPath)
  }
  showUnsaved.value = true
  return false
})

function confirmLeave() {
  showUnsaved.value = false
  const resume = pendingLeave
  pendingLeave = null
  resume?.()
}

function cancelLeave() {
  showUnsaved.value = false
  pendingLeave = null
}
</script>

<style scoped>
.reusable-editor__title-input,
.reusable-editor__subtitle-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: inherit;
  font: inherit;
  resize: none;
}

.reusable-editor__title-input:focus-visible,
.reusable-editor__subtitle-input:focus-visible {
  outline: 2px solid rgba(var(--v-theme-primary), 0.4);
  border-radius: 4px;
}

.reusable-editor__empty {
  padding: 48px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
