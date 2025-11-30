<template>
  <div class="landing">
    <div class="landing__card">
      <div class="landing__container">
        <div class="landing__content">
          <h1 class="landing__title">
            ATLAS
          </h1>

          <div class="landing__description">
            <!-- eslint-disable-next-line vue/no-v-html -- trusted i18n content -->
            <p v-html="tv('home.description', 'ATLAS is an open source application developed as a part of <a href=\'http://www.ohdsi.org\' target=\'_new\'>OHDSI</a> intended to provide a unified interface to patient level data and analytics.')" />
          </div>

          <div class="landing__documentation">
            <h2 class="landing__section-title">
              {{ t('home.documentation.title', 'Documentation') }}
            </h2>
            <!-- eslint-disable-next-line vue/no-v-html -- trusted i18n content -->
            <p v-html="tv('home.documentation.text', 'The ATLAS user guide can be found <a target=\'_new\' href=\'http://www.ohdsi.org/web/wiki/doku.php?id=documentation:software:atlas\'>here</a>.')" />
          </div>

          <div class="landing__actions">
            <button
              class="landing__button landing__button--outline"
              @click="handleSearchConcepts"
            >
              {{ t('home.gettingStarted.vocabulary.button', 'Search the Vocabulary') }}
            </button>
            <button
              class="landing__button landing__button--secondary"
              @click="handleNewCohort"
            >
              {{ t('home.gettingStarted.newCohort.button', 'Define a New Cohort') }}
            </button>
          </div>
        </div>

        <div class="landing__illustration">
          <img
            :src="atlasLogo"
            alt="ATLAS"
            class="landing__logo"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import atlasLogo from '@/assets/icons/atlas-loading.svg'

const router = useRouter()
const { t, tv } = useI18n()

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
  background-color: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-primary));
  display: flex;
  padding: 32px;
  font-size: 16px;
  box-sizing: border-box;
}

.landing__card {
  border-radius: 18px;
  padding: 30px;
  background-color: white;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.landing__container {
  margin: 30px auto;
  max-width: 940px;
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2rem;
}

.landing__content {
  padding-right: 2rem;
}

.landing__title {
  font-size: 4rem;
  font-weight: 300;
  margin: 0 0 2rem 0;
  letter-spacing: 0.2em;
  color: rgb(var(--v-theme-primary));
}

.landing__description {
  margin-bottom: 3rem;
}

.landing__description p {
  line-height: 1.6;
  margin: 0;
  color: rgb(var(--v-theme-primary));
}

.landing__description :deep(a),
.landing__documentation :deep(a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}

.landing__description :deep(a):hover,
.landing__documentation :deep(a):hover {
  color: rgb(var(--v-theme-accent));
}

.landing__documentation {
  margin-bottom: 3rem;
}

.landing__documentation p {
  margin: 0;
  color: rgb(var(--v-theme-primary));
}

.landing__section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: rgb(var(--v-theme-primary));
}

.landing__actions {
  display: flex;
  gap: 1rem;
}

.landing__button {
  padding: 0.75rem 1.5rem;
  min-width: 180px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 4px;
  border: 2px solid rgb(var(--v-theme-primary));
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-decoration: none;
  display: inline-block;
  text-align: center;
}

.landing__button--outline {
  background-color: transparent;
  color: rgb(var(--v-theme-primary));
}

.landing__button--outline:hover {
  background-color: rgb(var(--v-theme-primary));
  color: white;
}

.landing__button--secondary {
  color: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-orange));
  background-color: white;
}

.landing__button--secondary:hover {
  background-color: rgb(var(--v-theme-orange));
  color: white;
}

.landing__illustration {
  display: flex;
  justify-content: center;
  align-items: center;
}

.landing__logo {
  max-width: 100%;
  height: auto;
  width: 400px;
}

@media (max-width: 768px) {
  .landing__container {
    grid-template-columns: 1fr;
    gap: 2rem;
    text-align: center;
  }

  .landing__content {
    padding-right: 0;
  }

  .landing__title {
    font-size: 3rem;
  }

  .landing__actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .landing__logo {
    width: 300px;
  }
}

@media (max-width: 480px) {
  .landing {
    padding: 1rem;
  }

  .landing__card {
    padding: 1.5rem;
  }

  .landing__title {
    font-size: 2.5rem;
  }

  .landing__button {
    min-width: 150px;
    padding: 0.625rem 1.25rem;
  }
}
</style>
