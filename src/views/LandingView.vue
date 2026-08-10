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
            <p v-html="descriptionHtml" />
          </div>
          <div class="landing__actions">
            <AtlasButton
              size="lg"
              @click="handleNewCohort"
            >
              {{ t('home.gettingStarted.newCohort.button', 'Define a new cohort') }}
            </AtlasButton>
            <AtlasButton
              variant="secondary"
              size="lg"
              @click="handleSearchConcepts"
            >
              {{ t('home.gettingStarted.vocabulary.button', 'Search the vocabulary') }}
            </AtlasButton>
          </div>
        </div>
        <div class="landing__illustration">
          <img
            :src="landingLogoSrc"
            alt="Atlas"
            class="landing__logo"
          >
        </div>
      </div>
    </v-card>

    <div class="landing__features">
      <AtlasCard
        v-for="feature in features"
        :key="feature.id"
        tag="router-link"
        interactive
        padding="md"
        :to="feature.route"
        class="landing__feature"
      >
        <AtlasIcon
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
      </AtlasCard>
    </div>

    <AtlasCard
      tag="router-link"
      interactive
      padding="md"
      to="/docs"
      class="landing__feature landing__feature--docs"
      data-testid="landing-docs-link"
    >
      <AtlasIcon
        icon="mdi-book-open-page-variant-outline"
        size="24"
        class="landing__feature-icon"
      />
      <div class="landing__feature-title">
        {{ t('home.documentation.title', 'Documentation') }}
      </div>
      <div class="landing__feature-description">
        {{
          t(
            'home.features.docs',
            'Browse the ATLAS v3.0 user guide without leaving the app.'
          )
        }}
      </div>
    </AtlasCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import atlasLogo from '@/assets/icons/atlas-loading.svg'
import { AtlasButton, AtlasCard, AtlasIcon } from '@/components/ui'
import { pluginConfigService } from '@/services/PluginConfigService'

interface FeatureTile {
  id: string
  title: string
  description: string
  icon: string
  route: string
}

const router = useRouter()
const { t, tv } = useI18n()

const descriptionHtml = tv(
  'home.description',
  "ATLAS is an open source application developed as a part of <a href='http://www.ohdsi.org' target='_new'>OHDSI</a> intended to provide a unified interface to patient level data and analytics."
)

const features: FeatureTile[] = [
  {
    id: 'characterization',
    title: t('navigation.characterizations', 'Characterization').value,
    description: t(
      'home.features.characterization',
      "Describe a population's baseline features and outcomes."
    ).value,
    icon: 'mdi-microscope',
    route: '/characterizations',
  },
  {
    id: 'pathway',
    title: t('navigation.pathways', 'Treatment pathways').value,
    description: t('home.features.pathway', 'Visualize sequences of interventions over time.')
      .value,
    icon: 'mdi-vector-polyline',
    route: '/pathways',
  },
  {
    id: 'incidence-rate',
    title: t('navigation.incidenceRates', 'Incidence rates').value,
    description: t(
      'home.features.incidenceRate',
      'Estimate event rates over time across populations.'
    ).value,
    icon: 'mdi-chart-line',
    route: '/incidence-rates',
  },
]

const handleSearchConcepts = () => {
  router.push('/concepts')
}

const handleNewCohort = () => {
  router.push('/cohorts/new')
}

const customLandingLogoUrl = ref<string | null>(null)
const landingLogoSrc = computed(() => customLandingLogoUrl.value ?? atlasLogo)

onMounted(() => {
  customLandingLogoUrl.value = pluginConfigService.getLandingLogoUrl()
  const unsubscribe = pluginConfigService.onChange(() => {
    customLandingLogoUrl.value = pluginConfigService.getLandingLogoUrl()
  })
  onUnmounted(unsubscribe)
})
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
  /* MD3 elevated: matches SurfaceCard's two-pass shadow so the hero
   * reads at the same elevation as the rest of the cards on this
   * page. v-card needs !important to override Vuetify's variant. */
  box-shadow:
    0 1px 3px rgba(15, 23, 42, 0.08),
    0 8px 24px rgba(15, 23, 42, 0.08) !important;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 900px) {
  .landing__features {
    grid-template-columns: 1fr;
  }
}

.landing__feature {
  /* SurfaceCard provides surface, radius, shadow, hover lift, and
   * padding (md). This view-specific class only adds layout. */
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.landing__feature-icon {
  color: rgb(var(--v-theme-primary));
}

.landing__feature-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--atlas-color-on-surface);
}

.landing__feature-description {
  font-size: 12px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface-variant));
}

.landing__feature--docs {
  /* Docs tile sits alone in its own row beneath the analysis tiles. */
  width: 100%;
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
