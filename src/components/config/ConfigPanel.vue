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
        <span class="config-panel-title">{{ t('config.title', 'Configuration').value }}</span>
        <AtlasIconButton
          icon="mdi-close"
          v-bind="{ ariaLabel: tv('components.config.panel.closeAria', 'Close configuration panel') }"
          variant="text"
          size="sm"
          @click="handleClose"
        />
      </v-card-title>

      <AtlasDivider />

      <!-- Content Area -->
      <div class="config-panel__content d-flex flex-column flex-grow-1">
        <!-- Section Navigation - Tabs -->
        <AtlasTabs
          v-model="activeSection"
          color="primary"
          class="config-panel__nav"
        >
          <AtlasTab
            v-if="canSeeCache"
            value="cache"
          >
            <AtlasIcon start>
              mdi-database
            </AtlasIcon>
            {{ t('components.config.panel.tabCache', 'Cache').value }}
          </AtlasTab>
          <AtlasTab
            v-if="canSeeSources"
            value="sources"
          >
            <AtlasIcon start>
              mdi-database-cog
            </AtlasIcon>
            {{ t('navigation.datasources', 'Data Sources').value }}
          </AtlasTab>
          <AtlasTab
            v-if="canSeeTags"
            value="tags"
          >
            <AtlasIcon start>
              mdi-tag-multiple
            </AtlasIcon>
            {{ t('common.tags', 'Tags').value }}
          </AtlasTab>
          <AtlasTab
            v-if="canSeePermissions"
            value="permissions"
          >
            <AtlasIcon start>
              mdi-shield-account
            </AtlasIcon>
            {{ t('configuration.roles.tabs.permissions', 'Permissions').value }}
          </AtlasTab>
          <AtlasTab
            v-for="tab in pluginTabs"
            :key="tab.key"
            :value="tab.key"
            :data-testid="`config-tab-${tab.key}`"
          >
            <AtlasIcon start>
              {{ tab.icon ?? 'mdi-puzzle-outline' }}
            </AtlasIcon>
            {{ tab.name }}
          </AtlasTab>
        </AtlasTabs>

        <!-- Scrollable Content -->
        <v-card-text
          ref="scrollContainer"
          class="config-panel__sections flex-grow-1 overflow-y-auto"
          @scroll="handleScroll"
        >
          <!-- Cache Management Section (v-if ensures fresh data after login) -->
          <div
            v-if="activeSection === 'cache' && canSeeCache"
            class="config-section"
          >
            <CacheManagementSection />
          </div>

          <!-- Data Sources Section (v-if ensures fresh data after login) -->
          <div
            v-if="activeSection === 'sources' && canSeeSources"
            class="config-section"
          >
            <DataSourcesSection />
          </div>

          <!-- Tag Management Section (v-if ensures fresh data after login) -->
          <div
            v-if="activeSection === 'tags' && canSeeTags"
            class="config-section config-section--centered"
          >
            <TagManagementSection />
          </div>

          <!-- Permissions Section (v-if ensures fresh data after login) -->
          <div
            v-if="activeSection === 'permissions' && canSeePermissions"
            class="config-section config-section--centered"
          >
            <PermissionsSection />
          </div>

          <div
            v-for="tab in pluginTabs"
            v-show="activeSection === tab.key"
            :key="tab.key"
            class="config-section"
          >
            <PluginParcelOutlet
              v-if="activeSection === tab.key"
              :plugin-id="tab.pluginId"
              :item-id="tab.itemId"
              surface="admin-tabs"
            />
          </div>

          <!-- All admin sections hidden — show a friendly placeholder. -->
          <div
            v-if="!hasAnyAdminTab"
            class="config-section"
          >
            <AtlasAlert severity="info">
              {{
                t(
                  'components.config.panel.noAdminAccess',
                  "You don't have access to any administrative settings."
                ).value
              }}
            </AtlasAlert>
          </div>
        </v-card-text>
      </div>
    </v-card>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasDivider, AtlasIcon, AtlasIconButton, AtlasTab, AtlasTabs } from '@/components/ui'
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useUIStore } from '@/stores/ui'
import { usePermissions } from '@/composables/usePermissions'
import { usePluginMounts } from '@/composables/usePluginMounts'
import PluginParcelOutlet from '@/plugins/components/PluginParcelOutlet.vue'
import type { ConfigPanelSection } from '@/models/config.types'
import CacheManagementSection from './CacheManagementSection.vue'
import DataSourcesSection from './DataSourcesSection.vue'
import TagManagementSection from './TagManagementSection.vue'
import PermissionsSection from './PermissionsSection.vue'

const { t, tv } = useI18n()
const uiStore = useUIStore()
const { hasPermission } = usePermissions()
const { items: pluginTabs } = usePluginMounts('admin-tabs')

// Admin-only sections: hidden entirely from users without the matching admin
// permission, per the rule that admin functionality should disappear for
// normal users rather than show as disabled. The cog icon itself is hidden
// from the navbar when none of these are visible.
const canSeeCache = computed(() => hasPermission('admin:cache'))
const canSeeSources = computed(() => hasPermission('admin:source'))
const canSeeTags = computed(() => hasPermission('admin:tags'))
const canSeePermissions = computed(() => hasPermission('admin:security'))
const hasAnyAdminTab = computed(
  () =>
    canSeeCache.value ||
    canSeeSources.value ||
    canSeeTags.value ||
    canSeePermissions.value ||
    pluginTabs.value.length > 0
)

// Reactive state from UI store
const isOpen = computed({
  get: () => uiStore.configPanelState.isOpen,
  set: (value: boolean) => {
    if (value) {
      uiStore.openConfigPanel()
    } else {
      uiStore.closeConfigPanel()
    }
  },
})

// Fallback target for a stale `plugin:x:y` section (e.g. the plugin was
// unregistered while the drawer was closed): the first section this user can
// actually see, in the same order the tab strip renders them. Landing on
// 'cache' unconditionally would trade one blank pane for another if the user
// lacks admin:cache; falling through core tabs before plugin tabs keeps the
// choice meaningful, and if nothing is visible the no-access alert takes over
// regardless of which value we return here.
const fallbackSection = computed<ConfigPanelSection>(() => {
  if (canSeeCache.value) return 'cache'
  if (canSeeSources.value) return 'sources'
  if (canSeeTags.value) return 'tags'
  if (canSeePermissions.value) return 'permissions'
  return (pluginTabs.value[0]?.key as ConfigPanelSection | undefined) ?? 'cache'
})

const activeSection = computed({
  get: () => {
    const stored = uiStore.configPanelState.activeSection
    if (stored === 'vocabulary') return 'sources'
    if (stored.startsWith('plugin:') && !pluginTabs.value.some(tab => tab.key === stored)) {
      return fallbackSection.value
    }
    return stored
  },
  set: (value: ConfigPanelSection) => {
    // Map 'sources' to 'vocabulary' for the store
    const storeValue = value === 'sources' ? 'vocabulary' : value
    uiStore.setConfigPanelSection(storeValue)
  },
})

// Window width for responsive drawer sizing
const windowWidth = ref(window.innerWidth)

// Scroll container ref
const scrollContainer = ref<HTMLElement>()

/**
 * Computed drawer width - responsive based on viewport size
 * Mobile (≤768px): Use pixel value to avoid percentage issues
 * Tablet/Desktop: 85% with max 1400px, min 300px
 *
 * Regression: this previously returned `windowWidth.value - 100` regardless
 * of breakpoint, which does not implement the behavior documented above at
 * all. On a 1920px viewport that produced an 1820px drawer with no cap, and
 * on a 375px viewport it produced 275px, below the doc's own 300px floor.
 */
const drawerWidth = computed(() => {
  const w = windowWidth.value
  if (w <= 768) {
    return Math.max(w - 24, 300)
  }
  return Math.min(Math.max(w * 0.85, 300), 1400)
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
watch(isOpen, async value => {
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
  /* Vuetify's v-data-table inside child sections renders sticky headers at
     z-index: 4. Without an explicit stacking context here, those sticky
     headers can paint over the tab bar (the JobsSection bug). Lift the
     tab bar above any child sticky element. */
  position: relative;
  z-index: 5;
  background: rgb(var(--v-theme-surface));
}

.config-panel__nav .v-tab {
  text-transform: none;
  letter-spacing: normal;
}

.config-panel__sections {
  padding: 1.5rem;
  /* Establish a stacking context so position:sticky descendants (e.g. the
     v-data-table header inside JobsSection) stay clipped to the scroll
     container instead of bleeding upward over siblings. */
  position: relative;
  z-index: 0;
  isolation: isolate;
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
