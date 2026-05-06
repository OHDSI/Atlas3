<template>
  <div
    v-if="domainEntries.length > 0"
    class="profile-filter-chips d-flex align-center flex-wrap ga-2"
  >
    <AtlasChip
      v-for="entry in domainEntries"
      :key="entry.domain"
      :color="getDomainColor(entry.domain)"
      :variant="entry.active ? 'flat' : 'outlined'"
      size="sm"
      :data-test="entry.active ? 'profile-chip-active' : `profile-chip-${entry.domain}`"
      :data-test-domain="entry.domain"
      class="profile-filter-chips__pill"
      @click="store.setDomainFilter(entry.domain, !entry.active)"
    >
      <span>{{ entry.domain }}</span>
      <span class="profile-filter-chips__count">· {{ entry.count }}</span>
    </AtlasChip>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasChip } from '@/components/ui'
import { useProfileStore } from '@/stores/profile'
import { getDomainColor } from '@/utils/domain-colors'

const store = useProfileStore()

interface DomainEntry {
  domain: string
  count: number
  active: boolean
}

const domainEntries = computed<DomainEntry[]>(() =>
  Object.entries(store.domainCounts)
    .map(([domain, count]) => ({
      domain,
      count,
      active: store.domainFilter.has(domain),
    }))
    .sort((a, b) => b.count - a.count)
)
</script>

<style scoped>
.profile-filter-chips__pill {
  cursor: pointer;
}
.profile-filter-chips__count {
  margin-left: 4px;
  opacity: 0.75;
  font-variant-numeric: tabular-nums;
}
</style>
