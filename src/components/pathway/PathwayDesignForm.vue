<template>
  <div
    v-if="currentPathway"
    class="pathway-design-form"
  >
    <section>
      <h3>Description</h3>
      <v-text-field
        :model-value="currentPathway.name"
        label="Name"
        :readonly="readonly"
        density="compact"
        @update:model-value="(v: string) => store.updateMeta({ name: v })"
      />
      <v-textarea
        :model-value="currentPathway.description ?? ''"
        label="Description"
        :readonly="readonly"
        density="compact"
        rows="3"
        @update:model-value="(v: string) => store.updateMeta({ description: v })"
      />
    </section>

    <section>
      <h3>Target Cohorts</h3>
      <PathwayCohortList
        :cohorts="targetCohorts"
        :readonly="readonly"
        @rename="(id, name) => store.renameTargetCohort(id, name)"
        @remove="(id) => store.removeTargetCohort(id)"
      />
      <v-btn
        :disabled="readonly"
        @click="showTargetPicker = true"
      >
        Add target cohort
      </v-btn>
      <PathwayCohortPicker
        v-model="showTargetPicker"
        :excluded-ids="targetIds"
        @select="(refs) => refs.forEach((r) => store.addTargetCohort(r))"
      />
    </section>

    <section>
      <h3>Event Cohorts</h3>
      <PathwayCohortList
        :cohorts="eventCohorts"
        :readonly="readonly"
        @rename="(id, name) => store.renameEventCohort(id, name)"
        @remove="(id) => store.removeEventCohort(id)"
      />
      <v-btn
        :disabled="readonly"
        @click="showEventPicker = true"
      >
        Add event cohort
      </v-btn>
      <PathwayCohortPicker
        v-model="showEventPicker"
        :excluded-ids="eventIds"
        @select="(refs) => refs.forEach((r) => store.addEventCohort(r))"
      />
    </section>

    <section>
      <h3>Settings</h3>
      <PathwaySettings
        :model-value="currentPathway.design"
        :readonly="readonly"
        @update:model-value="(d) => store.updateDesign(d)"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePathwayStore } from '@/stores/pathway'
import PathwayCohortList from './PathwayCohortList.vue'
import PathwayCohortPicker from './PathwayCohortPicker.vue'
import PathwaySettings from './PathwaySettings.vue'

const store = usePathwayStore()
const { currentPathway, isReadOnly, isPreviewMode } = storeToRefs(store)
const readonly = computed(() => isReadOnly.value || isPreviewMode.value)

const showTargetPicker = ref(false)
const showEventPicker = ref(false)

const targetCohorts = computed(() => currentPathway.value?.design.targetCohorts ?? [])
const eventCohorts = computed(() => currentPathway.value?.design.eventCohorts ?? [])

const targetIds = computed(() => targetCohorts.value.map(c => c.id))
const eventIds = computed(() => eventCohorts.value.map(c => c.id))
</script>

<style scoped>
.pathway-design-form section { margin-bottom: 24px; }
</style>
