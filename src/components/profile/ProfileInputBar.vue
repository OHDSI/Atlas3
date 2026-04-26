<template>
  <v-card
    class="profile-input-bar"
    flat
    data-test="profile-input-bar"
  >
    <v-card-text class="d-flex align-center ga-3">
      <v-select
        v-model="selectedSource"
        :items="sourceItems"
        item-title="title"
        item-value="value"
        :label="tv('profiles.selectADataSource', 'Data Source')"
        density="compact"
        hide-details
        style="max-width: 240px;"
        data-test="profile-source-select"
        @update:model-value="onSourceChange"
      />
      <form
        class="d-flex align-center ga-2"
        data-test="profile-person-form"
        @submit.prevent="onSubmit"
      >
        <v-text-field
          v-model="personIdInput"
          :label="tv('profiles.personId', 'Person Id')"
          :disabled="!selectedSource"
          density="compact"
          hide-details
          style="max-width: 180px;"
          data-test="profile-person-input"
        />
        <v-btn
          type="submit"
          :disabled="!selectedSource || !personIdInput"
          color="primary"
          variant="tonal"
          data-test="profile-person-submit"
        >
          {{ tv('common.go', 'Go') }}
        </v-btn>
      </form>
      <v-chip
        v-if="cohortBadge"
        color="primary"
        variant="outlined"
        data-test="profile-cohort-badge"
      >
        {{ cohortBadge }}
      </v-chip>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDataSourcesStore } from '@/stores/datasources'
import { useProfileStore } from '@/stores/profile'
import { useI18n } from '@/composables/useI18n'

const { tv } = useI18n()
const router = useRouter()
const ds = useDataSourcesStore()
const profile = useProfileStore()

const selectedSource = ref<string | null>(profile.sourceKey)
const personIdInput = ref<string>(profile.personId !== null ? String(profile.personId) : '')

watch(() => profile.sourceKey, v => { selectedSource.value = v })
watch(() => profile.personId, v => { personIdInput.value = v !== null ? String(v) : '' })

const sourceItems = computed(() =>
  (ds.sources ?? [])
    .filter(s => (s.daimons ?? []).some(d => d.daimonType === 'CDM'))
    .map(s => ({ title: s.sourceName, value: s.sourceKey }))
)

const cohortBadge = computed(() =>
  profile.cohortDefinitionId !== null ? `Cohort #${profile.cohortDefinitionId}` : null
)

async function onSourceChange(v: string | null) {
  if (!v) return
  await router.push(`/profiles/${v}`)
}

async function onSubmit() {
  if (!selectedSource.value || !personIdInput.value) return
  await router.push(`/profiles/${selectedSource.value}/${personIdInput.value}`)
}

defineExpose({ onSourceChange, onSubmit })
</script>
