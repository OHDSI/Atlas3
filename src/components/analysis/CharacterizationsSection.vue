<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { AtlasButton } from '@/components/ui'
import CharacterizationsView from '@/views/CharacterizationsView.vue'
import FeatureAnalysesView from '@/views/FeatureAnalysesView.vue'

type SubView = 'characterizations' | 'feature-analyses'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const subView = computed<SubView>({
  get: () => (route.name === 'feature-analyses' ? 'feature-analyses' : 'characterizations'),
  set: (value) => {
    if (value && value !== subView.value) router.push({ name: value })
  },
})

const hintKey = computed(() =>
  subView.value === 'feature-analyses' ? 'analysis.featureAnalysesHint' : 'analysis.characterizationsHint',
)
</script>

<template>
  <div class="characterizations-section">
    <div class="characterizations-section__toolbar">
      <v-btn-toggle
        v-model="subView"
        mandatory
        density="compact"
        variant="outlined"
        :aria-label="t('analysis.characterizationViews').value"
      >
        <AtlasButton
          toggle
          value="characterizations"
          :aria-pressed="subView === 'characterizations'"
          data-testid="cc-subview-characterizations"
        >
          {{ t('navigation.characterizations') }}
        </AtlasButton>
        <AtlasButton
          toggle
          value="feature-analyses"
          :aria-pressed="subView === 'feature-analyses'"
          data-testid="cc-subview-feature-analyses"
        >
          {{ t('navigation.featureAnalyses') }}
        </AtlasButton>
      </v-btn-toggle>
      <p class="characterizations-section__hint">
        {{ t(hintKey) }}
      </p>
    </div>
    <CharacterizationsView v-if="subView === 'characterizations'" />
    <FeatureAnalysesView v-else />
  </div>
</template>

<style scoped>
.characterizations-section__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  margin-bottom: 12px;
}

.characterizations-section__hint {
  margin: 0;
  color: rgb(var(--v-theme-on-surface-variant, var(--v-theme-on-surface)));
}
</style>
