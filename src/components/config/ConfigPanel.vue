<template>
  <v-navigation-drawer
    v-model="isOpen"
    location="right"
    temporary
    :width="drawerWidth"
    class="config-panel"
  >
    <v-card
      class="config-panel__card"
      flat
    >
      <!-- Header -->
      <v-card-title class="config-panel__header d-flex align-center justify-space-between">
        <span class="config-panel-title">Configuration</span>
        <v-btn
          icon
          variant="text"
          aria-label="Close configuration panel"
          @click="handleClose"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <!-- Content Area -->
      <div class="config-panel__content d-flex flex-column flex-grow-1">
        <!-- Section Navigation - Tabs -->
        <v-tabs
          v-model="activeSection"
          color="primary"
          class="config-panel__nav"
        >
          <v-tab value="cache">
            <v-icon start>
              mdi-database
            </v-icon>
            Cache Management
          </v-tab>
          <v-tab value="sources">
            <v-icon start>
              mdi-database-cog
            </v-icon>
            Data Sources
          </v-tab>
          <v-tab value="tags">
            <v-icon start>
              mdi-tag-multiple
            </v-icon>
            Tag Management
          </v-tab>
        </v-tabs>

        <!-- Scrollable Content -->
        <v-card-text
          ref="scrollContainer"
          class="config-panel__sections flex-grow-1 overflow-y-auto"
          @scroll="handleScroll"
        >
          <!-- Cache Management Section -->
          <div
            v-show="activeSection === 'cache'"
            class="config-section"
          >
            <CacheManagementSection />
          </div>

          <!-- Data Sources Section -->
          <div
            v-show="activeSection === 'sources'"
            class="config-section"
          >
            <DataSourcesSection />
          </div>

          <!-- Tag Management Section -->
          <div
            v-show="activeSection === 'tags'"
            class="config-section config-section--centered"
          >
            <TagManagementSection />
          </div>
        </v-card-text>
      </div>
    </v-card>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import CacheManagementSection from './CacheManagementSection.vue'
import DataSourcesSection from './DataSourcesSection.vue'
import TagManagementSection from './TagManagementSection.vue'

const uiStore = useUIStore()

// Reactive state from UI store
const isOpen = computed({
  get: () => uiStore.configPanelState.isOpen,
  set: (value: boolean) => {
    if (value) {
      uiStore.openConfigPanel()
    } else {
      uiStore.closeConfigPanel()
    }
  }
})

const activeSection = computed({
  get: () => uiStore.configPanelState.activeSection === 'vocabulary' ? 'sources' : uiStore.configPanelState.activeSection,
  set: (value: 'cache' | 'sources' | 'tags') => {
    uiStore.setConfigPanelSection(value as any)
  }
})

// Window width for responsive drawer sizing
const windowWidth = ref(window.innerWidth)

// Scroll container ref
const scrollContainer = ref<HTMLElement>()

/**
 * Computed drawer width - responsive based on viewport size
 * Mobile (≤768px): Use pixel value to avoid percentage issues
 * Tablet/Desktop: 85% with max 1400px, min 300px
 */
const drawerWidth = computed(() => {
  if (windowWidth.value <= 768) {
    return windowWidth.value
  }
  // Ensure drawer doesn't exceed viewport and has minimum usable width
  const calculatedWidth = Math.min(windowWidth.value * 0.85, 1400)
  return Math.max(calculatedWidth, 300)
})

/**
 * Handle window resize to update drawer width
 */
function updateWidth() {
  windowWidth.value = window.innerWidth
}

/**
 * Handle scroll events to track scroll position
 */
function handleScroll(event: Event) {
  const target = event.target as HTMLElement
  uiStore.setConfigPanelScroll(target.scrollTop)
}

/**
 * Close the panel
 */
function handleClose() {
  uiStore.closeConfigPanel()
}

/**
 * Restore scroll position when panel opens
 */
watch(isOpen, async (value) => {
  if (value && scrollContainer.value) {
    await nextTick()
    scrollContainer.value.scrollTop = uiStore.configPanelState.scrollPosition
  }
})

/**
 * Lifecycle hooks
 */
onMounted(() => {
  window.addEventListener('resize', updateWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth)
})
</script>

<style scoped>
.config-panel {
  height: 100%;
}

/* Ensure drawer doesn't overflow viewport */
.config-panel :deep(.v-navigation-drawer__content) {
  max-width: 100vw;
  overflow-x: hidden;
}

.config-panel__card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.config-panel__header {
  padding: 1rem 1.5rem;
  flex-shrink: 0;
}

.config-panel__content {
  height: 100%;
  overflow: hidden;
}

.config-panel__nav {
  flex-shrink: 0;
}

.config-panel__nav .v-tab {
  text-transform: none;
  letter-spacing: normal;
}

.config-panel__sections {
  padding: 1.5rem;
}

.config-section {
  margin-bottom: 2rem;
}

.config-section--centered {
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

/* Responsive styles */
.config-panel-title {
  font-size: 1.25rem;
}

@media (min-width: 769px) {
  .config-panel-title {
    font-size: 1.5rem;
  }

  .config-panel__sections {
    padding: 2rem;
  }
}

@media (min-width: 1648px) {
  .config-panel-title {
    font-size: 1.75rem;
  }
}

/* Touch targets for mobile */
@media (max-width: 768px) {
  .v-list-item {
    min-height: 48px;
  }
}
</style>
