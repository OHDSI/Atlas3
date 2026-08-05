<template>
  <AtlasPageShell
    hero
    compact
    :eyebrow="eyebrow"
    :title="title"
    :subtitle="subtitle"
  >
    <div class="analysis-hub">
      <nav class="page-tabs-rail analysis-hub__tabs-rail">
        <AtlasTabs
          v-model="activeTabName"
          align-tabs="start"
          density="compact"
          color="primary"
          slider-color="primary"
          bg-color="transparent"
          class="page-tabs"
        >
          <AtlasTab
            v-for="tab in tabs"
            :key="tab.name"
            :value="tab.name"
          >
            <AtlasIcon
              start
              :icon="tab.icon"
            />
            {{ getLabel(tab) }}
          </AtlasTab>
        </AtlasTabs>
        <p
          v-if="activeTabHint"
          class="analysis-hub__tab-hint"
        >
          {{ activeTabHint }}
        </p>
      </nav>

      <v-window v-model="activeTabName">
        <v-window-item value="feature-analyses">
          <FeatureAnalysesView />
        </v-window-item>
        <v-window-item value="characterizations">
          <CharacterizationsView />
        </v-window-item>
        <v-window-item value="pathways">
          <PathwaysView />
        </v-window-item>
        <v-window-item value="incidence-rates">
          <IncidenceRatesView />
        </v-window-item>
        <v-window-item
          v-for="tab in pluginTabs"
          :key="tab.name"
          :value="tab.name"
        >
          <PluginParcelOutlet
            data-testid="analysis-plugin-outlet"
            :plugin-id="tab.plugin!.pluginId"
            :item-id="tab.plugin!.itemId"
            surface="analysis-tabs"
          />
        </v-window-item>
      </v-window>
    </div>
  </AtlasPageShell>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { usePluginMounts } from '@/composables/usePluginMounts'
import { AtlasIcon, AtlasPageShell, AtlasTab, AtlasTabs } from '@/components/ui'
import PluginParcelOutlet from '@/plugins/components/PluginParcelOutlet.vue'
import CharacterizationsView from '@/views/CharacterizationsView.vue'
import FeatureAnalysesView from '@/views/FeatureAnalysesView.vue'
import PathwaysView from '@/views/PathwaysView.vue'
import IncidenceRatesView from '@/views/IncidenceRatesView.vue'

interface Tab {
  name: string
  titleKey: string
  defaultLabel: string
  icon: string
  /** Short hint shown under the tab strip — gives per-tab context
   *  without making the hero title shake on tab change. */
  hintKey: string
  defaultHint: string
  plugin?: { pluginId: string; itemId: string }
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { items: pluginTabItems } = usePluginMounts('analysis-tabs')

const coreTabs: Tab[] = [
  {
    name: 'feature-analyses',
    titleKey: 'navigation.featureAnalyses',
    defaultLabel: 'Feature Analyses',
    icon: 'mdi-tune',
    hintKey: 'fa.subtitle',
    defaultHint: 'Reusable feature definitions for cohort characterization.',
  },
  {
    name: 'characterizations',
    titleKey: 'navigation.characterizations',
    defaultLabel: 'Characterizations',
    icon: 'mdi-chart-box-outline',
    hintKey: 'cc.subtitle',
    defaultHint: 'Compare cohorts on shared feature analyses.',
  },
  {
    name: 'pathways',
    titleKey: 'navigation.pathways',
    defaultLabel: 'Pathways',
    icon: 'mdi-source-branch',
    hintKey: 'pathways.subtitle',
    defaultHint: 'Trace event sequences across cohorts.',
  },
  {
    name: 'incidence-rates',
    titleKey: 'navigation.incidenceRates',
    defaultLabel: 'Incidence Rates',
    icon: 'mdi-chart-timeline-variant',
    hintKey: 'ir.subtitle',
    defaultHint: 'Rates of new events in target populations over time.',
  },
]

const tabs = computed<Tab[]>(() => [
  ...coreTabs,
  ...pluginTabItems.value.map(item => ({
    name: item.key,
    titleKey: item.name,
    defaultLabel: item.name,
    icon: item.icon ?? 'mdi-puzzle-outline',
    hintKey: item.hint ?? '',
    defaultHint: item.hint ?? '',
    plugin: { pluginId: item.pluginId, itemId: item.itemId },
  })),
])

const tabNames = computed(() => new Set(tabs.value.map(tab => tab.name)))

const pluginTabs = computed(() => tabs.value.filter(tab => tab.plugin))

// Bidirectional binding between active tab and the URL.
const activeTabName = computed<string>({
  get: () => {
    if (route.name === 'analysis-plugin') {
      const name = `plugin:${route.params.pluginId as string}:${route.params.itemId as string}`
      return tabNames.value.has(name) ? name : 'feature-analyses'
    }
    const name = route.name as string | undefined
    return name && tabNames.value.has(name) ? name : 'feature-analyses'
  },
  set: name => {
    if (!name || !tabNames.value.has(name)) return
    const tab = tabs.value.find(t => t.name === name)
    if (tab?.plugin) {
      if (
        route.name === 'analysis-plugin' &&
        route.params.pluginId === tab.plugin.pluginId &&
        route.params.itemId === tab.plugin.itemId
      ) {
        return
      }
      router.push({ name: 'analysis-plugin', params: tab.plugin })
      return
    }
    if (name !== route.name) router.push({ name })
  },
})

const STORAGE_KEY = 'atlas3.analysis.lastTab'

watch(
  activeTabName,
  name => {
    if (!name) return
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, name)
      }
    } catch {
      // localStorage may be unavailable (private mode); ignore.
    }
  },
  { immediate: true }
)

function getLabel(tab: Tab): string {
  if (tab.plugin) return tab.defaultLabel
  return t(tab.titleKey, tab.defaultLabel).value
}

const eyebrow = computed(() => `OHDSI · ${t('navigation.analysis', 'Analysis').value}`)
const activeTab = computed(
  () => tabs.value.find(tab => tab.name === activeTabName.value) ?? coreTabs[0]!
)

// Hero title and subtitle are stable — they describe the hub itself,
// not the active tab. Per-tab context lives in the small hint line
// below the tab strip (see template) so the hero doesn't shake when
// users switch tabs.
const title = computed(() => t('navigation.analysis', 'Analysis').value)
const subtitle = computed(
  () =>
    t(
      'analysis.subtitle',
      'Characterize cohorts, build features, trace pathways, and compute incidence rates.'
    ).value
)
const activeTabHint = computed(() => {
  const tab = activeTab.value
  if (tab.plugin) return tab.defaultHint
  return t(tab.hintKey, tab.defaultHint).value
})
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
  margin-bottom: 16px;
  padding-inline: 32px;
  position: relative;
  z-index: 2;
}

.analysis-hub__tab-hint {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
