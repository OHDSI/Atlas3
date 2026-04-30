<template>
  <page-shell>
    <div class="analysis-hub">
      <nav class="page-tabs-rail analysis-hub__tabs-rail">
        <v-tabs
          v-model="activeTabName"
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
          >
            <v-icon
              start
              :icon="tab.icon"
            />
            {{ getLabel(tab) }}
          </v-tab>
        </v-tabs>
      </nav>

      <v-window v-model="activeTabName">
        <v-window-item value="characterizations">
          <CharacterizationsView />
        </v-window-item>
        <v-window-item value="feature-analyses">
          <FeatureAnalysesView />
        </v-window-item>
        <v-window-item value="pathways">
          <PathwaysView />
        </v-window-item>
        <v-window-item value="incidence-rates">
          <IncidenceRatesView />
        </v-window-item>
      </v-window>
    </div>
  </page-shell>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import PageShell from '@/components/shared/PageShell.vue'
import CharacterizationsView from '@/views/CharacterizationsView.vue'
import FeatureAnalysesView from '@/views/FeatureAnalysesView.vue'
import PathwaysView from '@/views/PathwaysView.vue'
import IncidenceRatesView from '@/views/IncidenceRatesView.vue'

interface Tab {
  name: string
  titleKey: string
  defaultLabel: string
  icon: string
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const tabs: Tab[] = [
  { name: 'characterizations', titleKey: 'navigation.characterizations', defaultLabel: 'Characterizations', icon: 'mdi-chart-box-outline' },
  { name: 'feature-analyses', titleKey: 'navigation.featureAnalyses', defaultLabel: 'Feature Analyses', icon: 'mdi-tune' },
  { name: 'pathways', titleKey: 'navigation.pathways', defaultLabel: 'Pathways', icon: 'mdi-source-branch' },
  { name: 'incidence-rates', titleKey: 'navigation.incidenceRates', defaultLabel: 'Incidence Rates', icon: 'mdi-chart-timeline-variant' },
]

const tabNames = new Set(tabs.map(tab => tab.name))

// Bidirectional binding between active tab and the URL.
// Reading: pick the tab from the current route name (or fall back).
// Writing: pushing into v-tab/v-window updates the URL via router.push.
const activeTabName = computed<string>({
  get: () => {
    const name = route.name as string | undefined
    return name && tabNames.has(name) ? name : 'characterizations'
  },
  set: (name) => {
    if (name && tabNames.has(name) && name !== route.name) {
      router.push({ name })
    }
  },
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
</style>
