<template>
  <PageShell
    hero
    compact
    eyebrow="PROFILE"
  >
    <template #title>
      <v-text-field
        v-model="personIdInput"
        class="hero-person-id"
        :placeholder="tv('profiles.findAPerson', 'Find a person')"
        :aria-label="tv('profiles.personId', 'Person Id')"
        density="compact"
        hide-details
        variant="plain"
        single-line
        data-test="profile-person-input"
        @keydown.enter="commitPersonId"
        @blur="commitPersonId"
      />
    </template>

    <template #subtitle>
      <div
        v-if="store.personId !== null"
        class="profile-subtitle-row"
      >
        <span>{{ sourceName }}</span>
        <template v-if="store.cohortDefinitionId !== null">
          <span class="profile-subtitle-dot">·</span>
          <v-chip
            size="small"
            color="primary"
            variant="tonal"
            closable
            data-test="profile-cohort-badge"
            @click:close="clearCohort"
          >
            Cohort #{{ store.cohortDefinitionId }}
          </v-chip>
        </template>
      </div>
      <div
        v-else
        class="profile-subtitle-row"
      >
        {{ tv('profiles.chooseSourceAndPerson', 'Choose a data source and enter a person ID') }}
      </div>
    </template>

    <template #actions>
      <v-select
        v-model="selectedSource"
        :items="sourceItems"
        item-title="title"
        item-value="value"
        :label="tv('profiles.dataSource', 'Data source')"
        density="compact"
        hide-details
        variant="outlined"
        style="min-width: 220px; max-width: 260px;"
        data-test="profile-source-select"
        @update:model-value="onSourceChange"
      />
      <v-btn
        icon="mdi-refresh"
        variant="text"
        :title="tv('cohortDefinitions.cohortDefinitionManager.panels.reload', 'Reload')"
        :aria-label="tv('cohortDefinitions.cohortDefinitionManager.panels.reload', 'Reload')"
        data-test="profile-refresh"
        :disabled="!store.sourceKey || !store.personId"
        @click="onReload"
      />
    </template>

    <div class="profile-body">
      <ProfileDemographics
        v-if="store.person"
        data-test="profile-demographics"
      />

      <ProfileObservationBand v-if="store.person" />

      <SurfaceCard
        v-if="store.error"
        padding="md"
      >
        <div
          class="profile-error"
          data-test="profile-error"
        >
          <v-icon
            icon="mdi-alert-circle-outline"
            size="20"
            class="profile-error__icon"
          />
          <span>{{ store.error }}</span>
        </div>
      </SurfaceCard>

      <div
        v-else-if="store.loading"
        class="profile-loading"
      >
        <v-progress-circular
          indeterminate
          size="32"
        />
      </div>

      <div
        v-else-if="!store.person"
        class="profile-empty"
        data-test="profile-empty"
      >
        <v-icon
          icon="mdi-account-search-outline"
          size="48"
          class="profile-empty__icon"
        />
        <div class="profile-empty__text">
          {{ tv('profiles.emptyHint', 'Use the source picker and person ID above to load a profile.') }}
        </div>
      </div>

      <div
        v-if="store.person"
        class="profile-grid"
      >
        <div class="profile-grid__main">
          <ProfileTimeline />
          <ProfileEventsTable />
        </div>
        <div class="profile-grid__aside">
          <HighlightsPanel />
        </div>
      </div>
    </div>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageShell from '@/components/shared/PageShell.vue'
import SurfaceCard from '@/components/shared/SurfaceCard.vue'
import ProfileDemographics from '@/components/profile/ProfileDemographics.vue'
import ProfileTimeline from '@/components/profile/ProfileTimeline.vue'
import ProfileObservationBand from '@/components/profile/ProfileObservationBand.vue'
import ProfileEventsTable from '@/components/profile/ProfileEventsTable.vue'
import HighlightsPanel from '@/components/profile/HighlightsPanel.vue'
import { usePersonProfile } from '@/composables/usePersonProfile'
import { useProfileStore } from '@/stores/profile'
import { useDataSourcesStore } from '@/stores/datasources'
import { useI18n } from '@/composables/useI18n'

const route = useRoute()
const router = useRouter()
const params = computed(() => ({
  sourceKey: route.params.sourceKey as string | undefined,
  personId: route.params.personId as string | undefined,
  cohortId: route.params.cohortId as string | undefined,
}))
usePersonProfile(params)
const store = useProfileStore()
const ds = useDataSourcesStore()
const { tv } = useI18n()

// Hero source selector — mirrors store.sourceKey
const selectedSource = ref<string | null>(store.sourceKey)
watch(() => store.sourceKey, v => { selectedSource.value = v })

// Inline-edit person id input — mirrors store.personId
const personIdInput = ref<string>(store.personId !== null ? String(store.personId) : '')
watch(() => store.personId, v => { personIdInput.value = v !== null ? String(v) : '' })

// Fetch sources on mount when the store hasn't loaded them yet —
// the profile page is often the deep-link entry point so sources may
// not be populated yet. The store no-ops when already populated.
onMounted(() => {
  if (!ds.sources || ds.sources.length === 0) {
    ds.fetchDataSources().catch(() => { /* surfaced via store error */ })
  }
})

const sourceItems = computed(() =>
  (ds.sources ?? [])
    .filter(s => (s.daimons ?? []).some(d => d.daimonType === 'CDM'))
    .map(s => ({ title: s.sourceName, value: s.sourceKey }))
)

const sourceName = computed(() => {
  const key = store.sourceKey
  if (!key) return ''
  const found = (ds.sources ?? []).find(s => s.sourceKey === key)
  return found?.sourceName ?? key
})

function cohortSegment(): string {
  return store.cohortDefinitionId !== null ? `/${store.cohortDefinitionId}` : ''
}

async function onSourceChange(v: string | null) {
  if (!v) return
  if (store.personId !== null) {
    await router.push(`/profiles/${v}/${store.personId}${cohortSegment()}`)
  } else {
    await router.push(`/profiles/${v}`)
  }
}

async function commitPersonId() {
  const value = personIdInput.value.trim()
  if (!value) return
  if (!store.sourceKey) return
  if (store.personId !== null && String(store.personId) === value) return
  await router.push(`/profiles/${store.sourceKey}/${value}${cohortSegment()}`)
}

async function clearCohort() {
  if (!store.sourceKey || store.personId === null) return
  await router.push(`/profiles/${store.sourceKey}/${store.personId}`)
}

async function onReload() {
  await store.loadPerson()
}
</script>

<style scoped>
/* Inline-edit person id input — looks like the hero h1 until
 * focused/hovered. Mirrors the cohort-builder title pattern but
 * tuned for the v-text-field shell so the placeholder/text match
 * the hero typography. */
.hero-person-id {
  max-width: 320px;
}
.hero-person-id :deep(.v-field) {
  background: transparent;
  border-radius: 4px;
  transition: background 120ms ease;
}
.hero-person-id :deep(.v-field__outline) { display: none; }
.hero-person-id:hover :deep(.v-field),
.hero-person-id:focus-within :deep(.v-field) {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.hero-person-id :deep(input) {
  font-size: 26px;
  font-weight: 300;
  letter-spacing: 0.01em;
  line-height: 1.2;
  color: rgb(var(--v-theme-primary));
  padding: 0;
}
.hero-person-id :deep(input::placeholder) {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
  font-weight: 400;
}

.profile-subtitle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.profile-subtitle-dot {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.6;
}

.profile-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 16px;
}

.profile-grid__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.profile-grid__aside {
  min-width: 0;
}

.profile-error {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(var(--v-theme-error), 0.06);
  border-left: 3px solid rgb(var(--v-theme-error));
  border-radius: 4px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 13px;
  line-height: 1.5;
}

.profile-error__icon {
  color: rgb(var(--v-theme-error));
  flex-shrink: 0;
  margin-top: 1px;
}

.profile-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.profile-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.profile-empty__icon {
  color: rgb(var(--v-theme-on-surface-variant));
  margin-bottom: 12px;
}

.profile-empty__text {
  font-size: 14px;
  line-height: 1.5;
}
</style>
