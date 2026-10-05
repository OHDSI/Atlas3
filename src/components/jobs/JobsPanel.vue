<template>
  <v-navigation-drawer
    v-model="isOpen"
    location="right"
    temporary
    :width="drawerWidth"
    class="jobs-panel"
  >
    <v-card
      class="jobs-panel__card"
      flat
    >
      <v-card-title class="jobs-panel__header d-flex align-center justify-space-between">
        <span class="jobs-panel-title">{{ t('jobs.title', 'Jobs').value }}</span>
        <AtlasIconButton
          icon="mdi-close"
          v-bind="{ ariaLabel: t('jobs.close', 'Close jobs panel').value }"
          variant="text"
          size="sm"
          @click="handleClose"
        />
      </v-card-title>

      <AtlasDivider />

      <v-card-text class="jobs-panel__content flex-grow-1 overflow-y-auto">
        <JobsSection />
      </v-card-text>
    </v-card>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { AtlasDivider, AtlasIconButton } from '@/components/ui'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useI18n } from '@/composables/useI18n'
import JobsSection from '@/components/config/JobsSection.vue'

const uiStore = useUIStore()
const { t } = useI18n()

const isOpen = computed({
  get: () => uiStore.jobsPanelOpen,
  set: (value: boolean) => {
    if (value) uiStore.openJobsPanel()
    else uiStore.closeJobsPanel()
  },
})

const windowWidth = ref(window.innerWidth)

const drawerWidth = computed(() => windowWidth.value - 100)

function updateWidth() {
  windowWidth.value = window.innerWidth
}

function handleClose() {
  uiStore.closeJobsPanel()
}

onMounted(() => window.addEventListener('resize', updateWidth))
onUnmounted(() => window.removeEventListener('resize', updateWidth))
</script>

<style scoped>
.jobs-panel :deep(.v-navigation-drawer__content) {
  max-width: 100vw;
  overflow-x: hidden;
}

.jobs-panel__card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.jobs-panel__header {
  padding: 12px 16px;
}

.jobs-panel-title {
  font-size: 16px;
  font-weight: 600;
}

.jobs-panel__content {
  padding: 16px;
}
</style>
