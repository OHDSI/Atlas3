<!--
  CharacterizationConceptSetsTab

  Read-only stub: lists any concept sets stored on the characterization
  definition (`strataConceptSets`). Stratum-derived concept sets only
  populate once the criteria-builder integration lands; until then this
  shows a placeholder explainer.
-->
<template>
  <div class="char-conceptsets-tab">
    <h2 class="char-conceptsets-tab__title">
      {{ t('cc.fa.tabs.conceptSets', 'Concept Sets') }}
    </h2>
    <p class="char-conceptsets-tab__placeholder">
      {{
        t(
          'characterizations.editor.conceptSetsTab.placeholder',
          'Stratum-derived concept sets will appear here once the criteria builder lands.'
        )
      }}
    </p>

    <div
      v-if="conceptSets.length === 0"
      class="char-conceptsets-tab__empty"
      data-testid="char-conceptsets-empty"
    >
      {{ t('common.noData', 'No concept sets.') }}
    </div>
    <AtlasList
      v-else
      density="comfortable"
      class="char-conceptsets-tab__list"
      data-testid="char-conceptsets-list"
    >
      <AtlasListItem
        v-for="cs in conceptSets"
        :key="String(cs.id ?? '')"
      >
        <template #prepend>
          <AtlasIcon size="small">
            mdi-tag-multiple
          </AtlasIcon>
        </template>
        <v-list-item-title>
          {{ cs.name }}
        </v-list-item-title>
      </AtlasListItem>
    </AtlasList>
  </div>
</template>

<script setup lang="ts">
import { AtlasIcon, AtlasList, AtlasListItem } from '@/components/ui'
import { computed } from 'vue'

import { useI18n } from '@/composables/useI18n'
import type { CharacterizationDefinition, ConceptSet } from '@/models/characterization.types'

const props = defineProps<{
  characterization: CharacterizationDefinition
}>()

const { t } = useI18n()

const conceptSets = computed<ConceptSet[]>(
  () => props.characterization.strataConceptSets ?? []
)
</script>

<style scoped>
.char-conceptsets-tab {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.char-conceptsets-tab__title {
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0;
}

.char-conceptsets-tab__placeholder {
  color: #666;
  font-style: italic;
  margin: 0;
}

.char-conceptsets-tab__empty {
  padding: 12px 0;
  color: #666;
  font-style: italic;
}

.char-conceptsets-tab__list {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
}
</style>
