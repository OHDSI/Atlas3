<template>
  <page-shell>
    <div class="analysis-hub">
      <nav class="page-tabs-rail analysis-hub__tabs-rail">
        <v-tabs
          :model-value="activeTabName"
          align-tabs="start"
          density="comfortable"
          color="primary"
          slider-color="primary"
          bg-color="transparent"
          class="page-tabs"
        >
          <v-tab
            v-for="tab in tabs"
            :key="tab.name"
            :value="tab.name"
            :to="{ name: tab.name }"
          >
            <v-icon
              start
              :icon="tab.icon"
            />
            {{ getLabel(tab) }}
          </v-tab>
        </v-tabs>
      </nav>

      <router-view v-slot="{ Component, route: matchedRoute }">
        <component
          :is="Component"
          :key="matchedRoute.path"
        />
      </router-view>
    </div>
  </page-shell>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import PageShell from '@/components/shared/PageShell.vue'

interface Tab {
  name: string
  titleKey: string
  defaultLabel: string
  icon: string
}

const { t } = useI18n()
const route = useRoute()

const tabs: Tab[] = [
  { name: 'characterizations', titleKey: 'navigation.characterizations', defaultLabel: 'Characterizations', icon: 'mdi-chart-box-outline' },
  { name: 'feature-analyses', titleKey: 'navigation.featureAnalyses', defaultLabel: 'Feature Analyses', icon: 'mdi-tune' },
  { name: 'pathways', titleKey: 'navigation.pathways', defaultLabel: 'Pathways', icon: 'mdi-source-branch' },
  { name: 'incidence-rates', titleKey: 'navigation.incidenceRates', defaultLabel: 'Incidence Rates', icon: 'mdi-chart-timeline-variant' },
]

const tabNames = new Set(tabs.map(tab => tab.name))

const activeTabName = computed(() => {
  const name = route.name as string | undefined
  return name && tabNames.has(name) ? name : 'characterizations'
})

const STORAGE_KEY = 'atlas3.analysis.lastTab'

watch(activeTabName, (name) => {
  if (!name) return
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, name)
    }
  } catch {
    // localStorage may be unavailable (private mode); ignore.
  }
}, { immediate: true })

function getLabel(tab: Tab): string {
  return t(tab.titleKey, tab.defaultLabel).value
}
</script>

<style scoped>
.analysis-hub {
  display: flex;
  flex-direction: column;
}

/* Pull the rail flush to the page-shell card edges so the bottom
 * border spans the full card width — same trick ConceptsView uses. */
.analysis-hub__tabs-rail {
  margin-inline: -32px;
  margin-top: -32px;
  padding-inline: 32px;
  position: relative;
  z-index: 2;
}

/* Slide-fade between tab routes via a CSS keyframe.
 *
 * The route component's root (.analysis-list-layout) is remounted
 * whenever route.path changes (because of :key on <component :is>).
 * That mount triggers the `tab-fade-in` animation. No <transition>
 * wrapper is involved, which avoids Vue's transition system being
 * skipped for async-loaded route components.
 *
 * :deep() pierces the scoped-CSS boundary so the rule reaches the
 * route component's own scope. */
.analysis-hub :deep(.analysis-list-layout) {
  animation: tab-fade-in 280ms cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes tab-fade-in {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
