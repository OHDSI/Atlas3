<template>
  <div class="psp">
    <div
      v-if="error"
      class="psp__error"
    >
      <AtlasIcon
        icon="mdi-alert-circle-outline"
        size="20"
      />
      <span>{{ friendlyError }}</span>
    </div>
    <div
      v-else-if="loading"
      class="psp__loading"
    >
      <AtlasProgressCircular
        indeterminate
        size="32"
      />
    </div>
    <template v-else-if="person">
      <ProfileDemographics />
      <ProfileObservationBand />
      <HighlightsPanel />
      <ProfileTimeline />
      <ProfileEventsTable />
    </template>
  </div>
</template>

<script setup lang="ts">
import { AtlasIcon, AtlasProgressCircular } from '@/components/ui'
import { computed } from 'vue'
import ProfileDemographics from '@/components/profile/ProfileDemographics.vue'
import ProfileObservationBand from '@/components/profile/ProfileObservationBand.vue'
import ProfileTimeline from '@/components/profile/ProfileTimeline.vue'
import ProfileEventsTable from '@/components/profile/ProfileEventsTable.vue'
import HighlightsPanel from '@/components/profile/HighlightsPanel.vue'
import { usePersonProfile } from '@/composables/usePersonProfile'

const props = defineProps<{
  sourceKey: string
  personId: string
  cohortId?: number
}>()

const params = computed(() => ({
  sourceKey: props.sourceKey,
  personId: props.personId,
  cohortId: props.cohortId !== undefined ? String(props.cohortId) : undefined,
}))

const { person, loading, error } = usePersonProfile(params)

const friendlyError = computed(() => {
  const msg = error.value ?? ''
  if (msg.includes('403')) {
    return "You don't have access to this person's profile on this data source. Ask your admin to grant READ access to the source."
  }
  return msg || 'Failed to load profile.'
})
</script>

<style scoped>
.psp {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.psp__loading {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.psp__error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: rgba(var(--v-theme-error), 0.08);
  border: 1px solid rgba(var(--v-theme-error), 0.32);
  border-radius: 8px;
  color: rgb(var(--v-theme-on-surface));
}
</style>
