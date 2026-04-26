<template>
  <v-card
    flat
    class="profile-demographics"
    data-test="profile-demographics"
  >
    <v-card-text class="d-flex align-center ga-4">
      <v-icon
        :icon="genderIcon"
        size="32"
        data-test="profile-gender-icon"
      />
      <span data-test="profile-yob">{{ store.person?.yearOfBirth }}</span>
      <span data-test="profile-age">
        {{ ageLabel }}
      </span>
      <span data-test="profile-count">
        {{ store.person?.recordCount }} {{ tv('common.events', 'events') }}
      </span>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProfileStore } from '@/stores/profile'
import { useI18n } from '@/composables/useI18n'

const store = useProfileStore()
const { tv } = useI18n()

const genderIcon = computed(() => {
  switch ((store.person?.gender ?? '').toUpperCase()) {
    case 'FEMALE': return 'mdi-gender-female'
    case 'MALE': return 'mdi-gender-male'
    default: return 'mdi-help-circle-outline'
  }
})

const ageLabel = computed(() => {
  const age = store.person?.ageAtIndex ?? 0
  const ctx = store.hasCohortContext
    ? tv('profiles.atIndex', 'at index')
    : tv('profiles.atStartOfObservation', 'at start of observation')
  return `${age}y ${ctx}`
})
</script>
