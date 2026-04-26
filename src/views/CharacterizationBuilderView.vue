<!--
  Characterization Builder (PLACEHOLDER)

  Full editor — cohorts / feature analyses / strata / parameters /
  executions / versions tabs — lands in Phase 3 of the rollout.
  See: docs/characterization-implementation-plan.md (Phase 3).
-->
<template>
  <div class="page-wrapper">
    <div class="page-card">
      <v-container
        fluid
        class="characterization-builder"
      >
        <v-card
          variant="flat"
          class="characterization-builder__card"
        >
          <v-card-title class="text-h5">
            {{ t('characterizations.editor.comingSoon', 'Characterization editor coming soon') }}
          </v-card-title>
          <v-card-actions>
            <v-btn
              variant="text"
              prepend-icon="mdi-arrow-left"
              data-testid="characterization-builder-back"
              @click="handleBack"
            >
              {{ t('characterizations.editor.back', 'Back to list') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-container>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

import { useI18n } from '@/composables/useI18n'

const router = useRouter()
const { t } = useI18n()

function handleBack() {
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

.characterization-builder {
  padding: 0;
}

.characterization-builder__card {
  padding: 16px;
}
</style>
