<template>
  <v-container
    fluid
    class="profile-view"
  >
    <ProfileToolbar />
    <ProfileInputBar data-test="profile-input-bar" />
    <ProfileDemographics
      v-if="store.person"
      data-test="profile-demographics"
    />
    <div
      v-if="store.error"
      class="profile-error"
      data-test="profile-error"
    >
      {{ store.error }}
    </div>
    <div
      v-if="store.person"
      class="profile-body"
    >
      <div class="profile-main">
        <ProfileObservationBand />
        <ProfileTimeline />
        <ProfileEventsTable />
      </div>
      <HighlightsPanel />
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ProfileToolbar from '@/components/profile/ProfileToolbar.vue'
import ProfileInputBar from '@/components/profile/ProfileInputBar.vue'
import ProfileDemographics from '@/components/profile/ProfileDemographics.vue'
import ProfileTimeline from '@/components/profile/ProfileTimeline.vue'
import ProfileObservationBand from '@/components/profile/ProfileObservationBand.vue'
import ProfileEventsTable from '@/components/profile/ProfileEventsTable.vue'
import HighlightsPanel from '@/components/profile/HighlightsPanel.vue'
import { usePersonProfile } from '@/composables/usePersonProfile'
import { useProfileStore } from '@/stores/profile'

const route = useRoute()
const params = computed(() => ({
  sourceKey: route.params.sourceKey as string | undefined,
  personId: route.params.personId as string | undefined,
  cohortId: route.params.cohortId as string | undefined,
}))
usePersonProfile(params)
const store = useProfileStore()
</script>

<style scoped>
.profile-view { padding: 1rem; }
.profile-body { display: grid; grid-template-columns: 1fr auto; gap: 1rem; }
.profile-error { color: rgb(var(--v-theme-error)); padding: 0.5rem 0; }
</style>
