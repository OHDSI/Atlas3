<template>
  <page-shell>
    <div class="concepts-view">
      <v-tabs
        v-model="activeTab"
        bg-color="transparent"
        color="primary"
        class="mb-4"
        density="comfortable"
        centered
      >
        <v-tab value="search">
          {{ t('search.tabs.search', 'Concept Search') }}
        </v-tab>
        <v-tab value="sets">
          {{ t('cs.browser.caption', 'Concept Sets') }}
        </v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <v-window-item value="search">
          <ConceptSearch />
        </v-window-item>

        <v-window-item value="sets">
          <ConceptSetList />
        </v-window-item>
      </v-window>
    </div>
  </page-shell>
</template>

<script setup lang="ts">
import { ref, provide, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import PageShell from '@/components/shared/PageShell.vue'
import ConceptSearch from '@/components/concepts/ConceptSearch.vue'
import ConceptSetList from '@/components/concepts/ConceptSetList.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'

const route = useRoute()
const router = useRouter()
const conceptSetsStore = useConceptSetsStore()
const { t } = useI18n()

// Active tab state - sync with URL query
const activeTab = ref<string>((route.query.tab as string) || 'search')

// CDM source key configuration - will be dynamic in future
const sourceKey = ref('SYNPUF1K')

// Provide sourceKey to child components
provide('sourceKey', sourceKey)

// Watch for tab changes and update URL
watch(activeTab, (newTab) => {
  router.push({ query: { ...route.query, tab: newTab } })
  // Close the editor when switching tabs
  conceptSetsStore.closeEditor()
})
</script>

<style scoped>
.concepts-view {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

:deep(.v-slide-group__content) {
  justify-content: center !important;
}
</style>
