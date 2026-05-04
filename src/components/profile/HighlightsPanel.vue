<template>
  <!-- Was a permanent right v-navigation-drawer, but Vuetify's
       layout positions those at top:0 of the v-app, overlapping the
       NavBar (and its logout / config buttons). The ProfileView's
       body grid already lays out as 1fr/auto, so a plain aside fits
       in the second column without overlay chrome or z-index issues. -->
  <aside
    class="highlights-panel"
    data-test="highlights-panel"
  >
    <div class="highlights-panel__header">
      <div class="highlights-panel__eyebrow-row">
        <span class="text-eyebrow">{{ tv('profiles.highlightEyebrow', 'HIGHLIGHT') }}</span>
        <span class="highlights-panel__accent-rule" />
      </div>
    </div>

    <AtlasTabs
      v-model="tab"
      density="compact"
    >
      <AtlasTab
        value="concepts"
        data-test="highlights-tab-concepts"
      >
        {{ tv('profiles.highlightTabConcepts', 'concepts') }}
      </AtlasTab>
      <AtlasTab
        value="sets"
        data-test="highlights-tab-sets"
        :disabled="!store.hasCohortContext"
      >
        {{ tv('profiles.highlightTabSets', 'sets') }}
      </AtlasTab>
    </AtlasTabs>

    <v-window v-model="tab">
      <v-window-item value="concepts">
        <HighlightsConceptList />
      </v-window-item>
      <v-window-item value="sets">
        <HighlightsConceptSetList />
      </v-window-item>
    </v-window>

    <AtlasDivider class="my-2" />

    <div class="highlights-panel__footer">
      <AtlasButton
        variant="ghost"
        size="sm"
        icon="mdi-close-circle-outline"
        data-test="highlight-clear-all"
        @click="store.clearHighlights()"
      >
        {{ tv('profiles.clearAllHighlights', 'Clear all highlights') }}
      </AtlasButton>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasDivider, AtlasTab, AtlasTabs } from '@/components/ui'
import { ref } from 'vue'
import HighlightsConceptList from '@/components/profile/HighlightsConceptList.vue'
import HighlightsConceptSetList from '@/components/profile/HighlightsConceptSetList.vue'
import { useProfileStore } from '@/stores/profile'
import { useI18n } from '@/composables/useI18n'

const store = useProfileStore()
const { tv } = useI18n()

const tab = ref<'concepts' | 'sets'>('concepts')
</script>

<style scoped>
.highlights-panel {
  width: 320px;
  flex-shrink: 0;
  background: rgb(var(--v-theme-surface));
  border-radius: 12px;
  box-shadow:
    0 1px 3px rgba(15, 23, 42, 0.08),
    0 8px 24px rgba(15, 23, 42, 0.08);
  padding: 8px 0;
  align-self: flex-start;
}

.highlights-panel__header {
  padding: 8px 16px 0;
}

.highlights-panel__eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.highlights-panel__accent-rule {
  display: inline-block;
  width: 32px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}

.highlights-panel__footer {
  padding: 0 8px 4px;
}
</style>
