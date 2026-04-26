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
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { usePathwayStore } from '@/stores/pathway'
import PathwayBuilderToolbar from './PathwayBuilderToolbar.vue'
import PathwayDesignForm from './PathwayDesignForm.vue'
import PathwayGenerationPanel from './PathwayGenerationPanel.vue'

const store = usePathwayStore()
const { currentPathway, previewVersion } = storeToRefs(store)

// These refs will be wired into version/tag/permission dialogs in later tasks
const showVersions = ref(false)
const showTags = ref(false)
const showPermissions = ref(false)

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
