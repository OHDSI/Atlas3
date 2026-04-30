<template>
  <div class="landing">
    <v-card
      class="landing__hero"
      variant="flat"
      rounded="lg"
    >
      <div class="landing__hero-grid">
        <div class="landing__hero-content">
          <div class="landing__eyebrow-row">
            <span class="text-eyebrow">OHDSI · Atlas v3.0</span>
            <span class="landing__accent-rule" />
          </div>
          <h1 class="landing__title text-display">
            {{ t('home.title', 'Patient-level analytics, unified.') }}
          </h1>
          <div class="landing__description">
            <!-- eslint-disable-next-line vue/no-v-html -- trusted i18n content -->
            <p v-html="tv('home.description', 'ATLAS is an open source application developed as a part of <a href=\'http://www.ohdsi.org\' target=\'_new\'>OHDSI</a> intended to provide a unified interface to patient level data and analytics.')" />
          </div>
          <div class="landing__actions">
            <v-btn
              color="primary"
              size="large"
              @click="handleNewCohort"
            >
              {{ t('home.gettingStarted.newCohort.button', 'Define a new cohort') }}
            </v-btn>
            <v-btn
              variant="outlined"
              color="primary"
              size="large"
              @click="handleSearchConcepts"
            >
              {{ t('home.gettingStarted.vocabulary.button', 'Search the vocabulary') }}
            </v-btn>
          </div>
        </div>
        <div class="landing__illustration">
          <img
            :src="atlasLogo"
            alt="Atlas"
            class="landing__logo"
          >
        </div>
      </div>
    </v-card>

    <div class="landing__features">
      <router-link
        v-for="feature in features"
        :key="feature.id"
        :to="feature.route"
        class="landing__feature"
      >
        <v-icon
          :icon="feature.icon"
          size="24"
          class="landing__feature-icon"
        />
        <div class="landing__feature-title">
          {{ feature.title }}
        </div>
        <div class="landing__feature-description">
          {{ feature.description }}
        </div>
      </router-link>
    </div>

    <div class="landing__documentation">
      <h2 class="landing__section-title">
        {{ t('home.documentation.title', 'Documentation') }}
      </h2>
      <!-- eslint-disable-next-line vue/no-v-html -- trusted i18n content -->
      <p v-html="tv('home.documentation.text', 'The ATLAS user guide can be found <a target=\'_new\' href=\'http://www.ohdsi.org/web/wiki/doku.php?id=documentation:software:atlas\'>here</a>.')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import atlasLogo from '@/assets/icons/atlas-loading.svg'

interface FeatureTile {
  id: string
  title: string
  description: string
  icon: string
  route: string
}

const router = useRouter()
const { t, tv } = useI18n()

const features: FeatureTile[] = [
  {
    id: 'characterization',
    title: t('navigation.characterizations', 'Characterization').value,
    description: t('home.features.characterization', 'Describe a population\'s baseline features and outcomes.').value,
    icon: 'mdi-microscope',
    route: '/characterizations',
  },
  {
    id: 'incidence-rate',
    title: t('navigation.incidenceRates', 'Incidence rates').value,
    description: t('home.features.incidenceRate', 'Estimate event rates over time across populations.').value,
    icon: 'mdi-chart-line',
    route: '/incidence-rates',
  },
  {
    id: 'pathway',
    title: t('navigation.pathways', 'Treatment pathways').value,
    description: t('home.features.pathway', 'Visualize sequences of interventions over time.').value,
    icon: 'mdi-vector-polyline',
    route: '/pathways',
  },
]

const handleSearchConcepts = () => {
  router.push('/concepts')
}

const handleNewCohort = () => {
  router.push('/cohorts/new')
}
</script>

<style scoped>
.landing {
  min-height: 100%;
  background-color: rgb(var(--v-theme-surface-variant));
  padding: 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.landing__hero {
  border: 1px solid rgb(var(--v-theme-outline-variant)) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
}

.landing__hero-grid {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 48px;
  align-items: center;
  padding: 56px 48px;
}

.landing__hero-content {
  min-width: 0;
}

.landing__eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.landing__accent-rule {
  display: inline-block;
  width: 32px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}

.landing__title {
  color: rgb(var(--v-theme-primary));
  margin: 0 0 14px 0;
  max-width: 680px;
}

.landing__description {
  margin-bottom: 28px;
  font-size: 15px;
  line-height: 1.55;
  color: rgb(var(--v-theme-on-surface-variant));
  max-width: 520px;
}

.landing__description :deep(a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}

.landing__description :deep(a):hover {
  color: rgb(var(--v-theme-orange));
}

.landing__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.landing__illustration {
  display: flex;
  align-items: center;
  justify-content: center;
}

.landing__logo {
  width: 300px;
  height: auto;
  display: block;
}

.landing__features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.landing__feature {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 20px;
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-outline-variant));
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
}

.landing__feature:hover {
  border-color: rgba(31, 66, 90, 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.landing__feature-icon {
  color: rgb(var(--v-theme-primary));
}

.landing__feature-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
}

.landing__feature-description {
  font-size: 12px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface-variant));
}

.landing__documentation {
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-outline-variant));
  border-radius: 12px;
  padding: 24px;
}

.landing__section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: rgba(0, 0, 0, 0.87);
}

.landing__documentation p {
  margin: 0;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.landing__documentation :deep(a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}

@media (max-width: 768px) {
  .landing__hero-grid {
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 40px 24px;
    text-align: left;
  }

  .landing__logo {
    width: 220px;
  }
}

@media (max-width: 480px) {
  .landing {
    padding: 16px;
  }

  .landing__hero-grid {
    padding: 32px 20px;
  }
}
</style>
