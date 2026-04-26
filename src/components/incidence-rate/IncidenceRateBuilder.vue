<template>
  <div class="ir-builder">
    <IncidenceRateBuilderToolbar />

    <v-tabs
      v-model="activeTab"
      color="primary"
    >
      <v-tab value="definition">
        {{ t('incidenceRate.tabs.definition', 'Definition') }}
      </v-tab>
      <v-tab value="conceptSets">
        {{ t('incidenceRate.tabs.conceptSets', 'Concept Sets') }}
      </v-tab>
      <v-tab
        value="generation"
        :disabled="!store.currentIR?.id"
      >
        {{ t('incidenceRate.tabs.generation', 'Generation') }}
      </v-tab>
      <v-tab
        value="versions"
        :disabled="!store.currentIR?.id"
      >
        {{ t('incidenceRate.tabs.versions', 'Versions') }}
      </v-tab>
    </v-tabs>

    <v-window
      v-model="activeTab"
      class="window"
    >
      <v-window-item value="definition">
        <IncidenceRateDefinitionPanel />
      </v-window-item>
      <v-window-item value="conceptSets">
        <IncidenceRateConceptSetsPanel />
      </v-window-item>
      <v-window-item value="generation">
        <IncidenceRateGenerationPanel
          v-if="store.currentIR?.id"
          :ir-id="store.currentIR.id"
        />
      </v-window-item>
      <v-window-item value="versions">
        <IncidenceRateVersionsPanel
          v-if="store.currentIR?.id"
          :ir-id="store.currentIR.id"
        />
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import IncidenceRateBuilderToolbar from '@/components/incidence-rate/IncidenceRateBuilderToolbar.vue'
import IncidenceRateDefinitionPanel from '@/components/incidence-rate/IncidenceRateDefinitionPanel.vue'
import IncidenceRateConceptSetsPanel from '@/components/incidence-rate/IncidenceRateConceptSetsPanel.vue'
import IncidenceRateGenerationPanel from '@/components/incidence-rate/IncidenceRateGenerationPanel.vue'
import IncidenceRateVersionsPanel from '@/components/incidence-rate/IncidenceRateVersionsPanel.vue'

const { t } = useI18n()
const store = useIncidenceRateStore()
const activeTab = ref<'definition' | 'conceptSets' | 'generation' | 'versions'>('definition')
</script>

<style scoped>
.ir-builder { display: flex; flex-direction: column; gap: 12px; }
.window { padding: 12px 0; }
</style>
