<template>
  <div class="page-wrapper">
    <div class="page-card">
      <div class="concepts-view">
        <v-tabs
          v-model="activeTab"
          bg-color="transparent"
          color="primary"
          class="mb-4"
          density="comfortable"
          centered
        >
          <v-tab value="search">Concept Search</v-tab>
          <v-tab value="sets">Concept Sets</v-tab>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, provide, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ConceptSearch from '@/components/concepts/ConceptSearch.vue'
import ConceptSetList from '@/components/concepts/ConceptSetList.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'

const route = useRoute()
const router = useRouter()
const conceptSetsStore = useConceptSetsStore()

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
.page-wrapper {
  min-height: 100%;
  background-color: rgb(var(--v-theme-background));
  display: flex;
  padding: 32px;
  box-sizing: border-box;
}

.page-card {
  border-radius: 18px;
  padding: 30px;
  background-color: white;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.concepts-view {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

:deep(.v-slide-group__content) {
  justify-content: center !important;
}
</style>
