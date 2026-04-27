<template>
  <div class="analysis-hub">
    <v-tabs
      :model-value="activeTabName"
      align-tabs="start"
      color="primary"
      class="analysis-hub__tabs"
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

    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'

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
.analysis-hub__tabs {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  margin-bottom: 8px;
}
</style>
