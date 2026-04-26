<template>
  <v-toolbar density="compact" flat class="profile-toolbar">
    <v-toolbar-title>{{ tv('profiles.title', 'Profiles') }}</v-toolbar-title>
    <v-spacer />
    <v-btn
      icon="mdi-refresh"
      :title="tv('common.reload', 'Reload')"
      data-test="profile-refresh"
      :disabled="!store.sourceKey || !store.personId"
      @click="onReload"
    />
  </v-toolbar>
</template>

<script setup lang="ts">
import { useProfileStore } from '@/stores/profile'
import { useI18n } from '@/composables/useI18n'

const store = useProfileStore()
const { tv } = useI18n()

async function onReload() {
  await store.loadPerson()
}
</script>
