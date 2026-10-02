<template>
  <AtlasPageShell
    hero
    compact
    :eyebrow="`OHDSI · ${t('facets.caption.vocabulary', 'Vocabulary').value}`"
    :title="pageTitle"
    :subtitle="pageSubtitle"
  >
    <div class="concepts-view-outer">
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
                icon="mdi-shape"
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

        <v-window
          v-model="activeTab"
          class="concepts-view__window"
        >
          <v-window-item value="sets">
            <ConceptSetList />
          </v-window-item>

          <v-window-item
            value="search"
            class="concepts-view__search"
          >
            <ConceptSearch />
          </v-window-item>
        </v-window>

        <!-- Page-level concept set editor (overlays both tabs) -->
        <ConceptSetEditor
          v-if="conceptSetsStore.editorOpen"
          :model-value="conceptSetsStore.editorOpen"
          :concept-set="conceptSetsStore.currentSet"
          @update:model-value="
            value => {
              if (!value) conceptSetsStore.closeEditor()
            }
          "
          @save="onEditorSave"
        />
      </div>
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
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useWebAPIStore } from '@/stores/webapi'
import { getSourceKey as getDefaultSourceKey } from '@/config/webapi'

const route = useRoute()
const router = useRouter()
const conceptSetsStore = useConceptSetsStore()
const webapiStore = useWebAPIStore()
const { t } = useI18n()

const pageTitle = computed(() => t('cs.browser.caption', 'Concepts').value)
const pageSubtitle = computed(
  () =>
    t('cs.browser.subtitle', 'Browse the OMOP vocabulary and curate reusable concept sets.').value
)

// Active tab state - sync with URL query. Default to "sets" (concept sets list).
const activeTab = ref<string>((route.query.tab as string) || 'sets')

// Vocabulary source key — derived from the webapi store's available vocabulary
// sources, falling back to the configured default. Stays reactive so child
// components see the right source once the WebAPI sources finish loading.
const sourceKey = computed(
  () => webapiStore.getValidVocabularySource() || getDefaultSourceKey() || '',
)

// Provide sourceKey to child components (as a ref-like object with `.value`
// to keep the existing inject contract — `inject<{ value: string }>('sourceKey')`).
provide('sourceKey', sourceKey)

async function onEditorSave() {
  await conceptSetsStore.fetchAll()
}

// Watch for tab changes and update URL. `immediate: true` syncs the URL to
// the default tab on mount so deep-links / query params stay accurate.
watch(
  activeTab,
  newTab => {
    if (route.query.tab !== newTab) {
      router.replace({ query: { ...route.query, tab: newTab } })
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.concepts-view-outer {
  container-type: inline-size;
  width: 100%;
}

.concepts-view {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

/* Search content breaks out of the 1400px column to 95% of the page; the tab rail is untouched. */
.concepts-view__window {
  overflow: visible;
}

.concepts-view__search {
  width: max(100%, 95cqw);
  margin-inline: min(0px, calc(50% - 47.5cqw));
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
