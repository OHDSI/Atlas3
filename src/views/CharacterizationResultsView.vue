<!--
  Characterization Results (placeholder)

  Phase 5 will replace this with the real prevalence/distribution viewer.
  For now we register the route + a friendly stub so the "View results"
  button on the executions list has somewhere to go.
-->
<template>
  <div class="page-wrapper">
    <div class="page-card">
      <v-container fluid>
        <div class="results-stub__toolbar">
          <v-btn
            variant="text"
            prepend-icon="mdi-arrow-left"
            data-testid="char-results-back"
            @click="goBack"
          >
            {{ t('characterizations.editor.executions.results.back', 'Back to builder') }}
          </v-btn>
          <h1 class="results-stub__title">
            {{ t('characterizations.editor.executions.title', 'Executions') }}
          </h1>
        </div>

        <v-card
          class="results-stub__card"
          variant="outlined"
        >
          <v-card-text class="results-stub__body">
            <v-icon
              size="48"
              color="primary"
              class="mb-3"
            >
              mdi-chart-bar
            </v-icon>
            <p class="text-h6 mb-2">
              {{
                t(
                  'characterizations.editor.executions.results.comingSoon',
                  'Results viewer coming soon'
                )
              }}
            </p>
            <p class="text-body-2 text-medium-emphasis">
              Characterization #{{ id }} · Execution #{{ executionId }}
            </p>
          </v-card-text>
        </v-card>
      </v-container>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

import { useI18n } from '@/composables/useI18n'

defineProps<{
  id: string
  executionId: string
}>()

const router = useRouter()
const { t } = useI18n()

function goBack() {
  router.push('/characterizations')
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

.results-stub__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.results-stub__title {
  font-size: 1.5rem;
  font-weight: 500;
  margin: 0;
}

.results-stub__card {
  padding: 24px;
}

.results-stub__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 16px;
}
</style>
