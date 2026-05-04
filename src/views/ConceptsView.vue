<template>
  <AtlasPageShell
    hero
    compact
    eyebrow="OHDSI · Vocabulary"
    :title="pageTitle"
    :subtitle="pageSubtitle"
  >
    <div class="concepts-view">
      <nav class="page-tabs-rail concepts-view__tabs-rail">
        <AtlasTabs
          v-model="activeTab"
          align-tabs="start"
          density="comfortable"
          color="primary"
          slider-color="primary"
          bg-color="transparent"
          class="page-tabs"
        >
          <AtlasTab value="sets">
            <AtlasIcon
              start
              icon="mdi-bookmark-multiple-outline"
            />
            {{ t('cs.browser.caption', 'Concept Sets') }}
          </AtlasTab>
          <AtlasTab value="search">
            <AtlasIcon
              start
              icon="mdi-magnify"
            />
            {{ t('search.tabs.search', 'Concept Search') }}
          </AtlasTab>
        </AtlasTabs>
      </nav>

      <v-window v-model="activeTab">
        <v-window-item value="sets">
          <ConceptSetList />
        </v-window-item>

        <v-window-item value="search">
          <ConceptSearch />
        </v-window-item>
      </v-window>
    </div>
  </AtlasPageShell>
</template>

<script setup lang="ts">
import { ref, computed, provide, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { AtlasIcon, AtlasPageShell, AtlasTab, AtlasTabs } from '@/components/ui'
import ConceptSearch from '@/components/concepts/ConceptSearch.vue'
import ConceptSetList from '@/components/concepts/ConceptSetList.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'

const route = useRoute()
const router = useRouter()
const conceptSetsStore = useConceptSetsStore()
const { t } = useI18n()

const pageTitle = computed(() => t('cs.browser.caption', 'Concepts').value)
const pageSubtitle = computed(
  () =>
    t('cs.browser.subtitle', 'Browse the OMOP vocabulary and curate reusable concept sets.').value
)

// Active tab state - sync with URL query. Default to "sets" (concept sets list).
const activeTab = ref<string>((route.query.tab as string) || 'sets')

// CDM source key configuration - will be dynamic in future
const sourceKey = ref('SYNPUF1K')

// Provide sourceKey to child components
provide('sourceKey', sourceKey)

// Watch for tab changes and update URL. `immediate: true` syncs the URL to
// the default tab on mount so deep-links / query params stay accurate.
watch(
  activeTab,
  newTab => {
    if (route.query.tab !== newTab) {
      router.replace({ query: { ...route.query, tab: newTab } })
    }
    // Close the editor when switching tabs
    conceptSetsStore.closeEditor()
  },
  { immediate: true }
)
</script>

<style scoped>
.concepts-view {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

/* The shared .page-tabs-rail provides padding + bottom border;
 * pull the rail flush to the page-shell card by negating the card's
 * horizontal padding so the rail spans the full width. With the hero
 * header above, the rail flows below it naturally — no negative
 * top margin. */
.concepts-view__tabs-rail {
  margin-inline: -32px;
  margin-bottom: 16px;
  padding-inline: 32px;
}
</style>
