<!--
  Feature Analysis Editor — STUB.

  TODO: Replace this placeholder with the real editor.
  See docs/characterization-implementation-plan.md (Phase 2 — Feature Analyses).
  The editor still needs to be implemented for all three FA design types:
    - PRESET        (FeatureExtraction CovariateSetting JSON)
    - CRITERIA_SET  (CohortBuilder-style criteria group + concept sets)
    - CUSTOM_FE     (raw SQL template)
-->
<template>
  <div class="page-wrapper">
    <div class="page-card">
      <v-container
        fluid
        class="feature-analysis-editor"
      >
        <v-row justify="center">
          <v-col
            cols="12"
            md="8"
            lg="6"
          >
            <v-card
              class="feature-analysis-editor__card"
              data-testid="feature-analysis-editor-stub"
            >
              <v-card-title class="text-h5">
                {{ t('featureAnalyses.editor.comingSoon', 'Feature Analysis editor coming soon') }}
              </v-card-title>
              <v-card-text>
                <p class="mb-2">
                  {{ headerLine }}
                </p>
                <p class="text-body-2 text-grey">
                  {{ t('common.comingSoon', 'This feature is under development.') }}
                </p>
              </v-card-text>
              <v-card-actions>
                <v-spacer />
                <v-btn
                  color="primary"
                  variant="elevated"
                  prepend-icon="mdi-arrow-left"
                  data-testid="feature-analysis-editor-back"
                  @click="goBack"
                >
                  {{ t('featureAnalyses.editor.back', 'Back to list') }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useI18n } from '@/composables/useI18n'

defineProps<{
  id?: string
}>()

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const headerLine = computed(() => {
  const id = (route.params.id as string | undefined) ?? null
  if (id) {
    return `Editing feature analysis ${id} — editor not implemented yet.`
  }
  return 'New feature analysis — editor not implemented yet.'
})

function goBack() {
  router.push('/feature-analyses')
}
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

.feature-analysis-editor {
  padding: 0;
}

.feature-analysis-editor__card {
  padding: 16px;
}
</style>
