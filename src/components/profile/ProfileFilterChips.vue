<template>
  <div class="profile-filter-chips d-flex align-center flex-wrap ga-2">
    <v-chip
      v-for="d in activeDomains"
      :key="d"
      closable
      color="primary"
      variant="tonal"
      size="small"
      data-test="profile-chip-active"
      @click:close="store.setDomainFilter(d, false)"
    >
      {{ d }}
    </v-chip>

    <v-menu v-if="availableDomains.length > 0">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          size="small"
          variant="text"
          prepend-icon="mdi-plus"
          data-test="profile-chip-add"
        >
          Domain
        </v-btn>
      </template>
      <v-list>
        <v-list-item
          v-for="d in availableDomains"
          :key="d.name"
          :title="`${d.name} (${d.count})`"
          @click="store.setDomainFilter(d.name, true)"
        />
      </v-list>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProfileStore } from '@/stores/profile'

const store = useProfileStore()

const activeDomains = computed(() => Array.from(store.domainFilter))
const availableDomains = computed(() =>
  Object.entries(store.domainCounts)
    .filter(([k]) => !store.domainFilter.has(k))
    .map(([name, count]) => ({ name, count }))
)
</script>
