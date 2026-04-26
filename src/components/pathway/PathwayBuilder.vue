<template>
  <div class="pathway-builder">
    <div
      v-if="!currentPathway"
      class="empty"
    >
      No pathway loaded
    </div>

    <template v-else>
      <div
        v-if="previewVersion"
        class="preview-banner"
      >
        Previewing version {{ previewVersion.version }} — saving will create a new pathway
      </div>

      <PathwayBuilderToolbar
        @open-versions="showVersions = true"
        @open-tags="showTags = true"
        @open-permissions="showPermissions = true"
      />

      <div class="main">
        <div class="design">
          <PathwayDesignForm />
        </div>
        <div class="side">
          <PathwayGenerationPanel
            v-if="currentPathway?.id"
            :pathway-id="currentPathway.id"
          />
        </div>
      </div>

      <v-dialog
        v-model="showVersions"
        max-width="900"
      >
        <VersionsTabContent
          v-if="versionsConfig"
          :config="versionsConfig"
        />
      </v-dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { usePathwayStore } from '@/stores/pathway'
import PathwayBuilderToolbar from './PathwayBuilderToolbar.vue'
import PathwayDesignForm from './PathwayDesignForm.vue'
import PathwayGenerationPanel from './PathwayGenerationPanel.vue'
import VersionsTabContent from '@/components/versions/VersionsTabContent.vue'
import type { VersionsConfig, VersionsTableItem } from '@/components/versions/types'

const store = usePathwayStore()
const { currentPathway, previewVersion, isDirty, isPreviewMode } = storeToRefs(store)

const showVersions = ref(false)
const showTags = ref(false)
const showPermissions = ref(false)

const canEdit = computed(() => !isPreviewMode.value)
const isDirtyRef = computed(() => isDirty.value)

const versionsConfig = computed<VersionsConfig | null>(() => {
  const p = currentPathway.value
  if (!p?.id) return null

  const current: VersionsTableItem = {
    version: 0,
    assetId: p.id,
    createdBy: { id: 0, name: p.createdBy?.name ?? '' },
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
.pathway-builder { padding: 16px; }
.empty { padding: 32px; text-align: center; color: #888; }
.preview-banner {
  background: #fff8c5; padding: 8px 12px; margin-bottom: 12px; border-left: 4px solid #d39e00;
}
.main { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; margin-top: 12px; }
@media (max-width: 1100px) { .main { grid-template-columns: 1fr; } }
</style>
