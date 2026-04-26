<template>
  <div
    class="profile-obs-band"
    data-test="profile-obs-band"
  >
    <svg
      :viewBox="`0 0 ${viewWidth} 12`"
      preserveAspectRatio="none"
      width="100%"
      height="12"
    >
      <rect
        v-for="(b, i) in bands"
        :key="i"
        :x="x(b.x1)"
        y="0"
        :width="Math.max(1, x(b.x2) - x(b.x1))"
        height="12"
        fill="#b7cbdc"
        opacity="0.7"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProfileStore } from '@/stores/profile'

const store = useProfileStore()
const viewWidth = 1000

const extents = computed(() => {
  const bs = store.observationBands
  if (bs.length === 0) return { min: 0, max: 1 }
  return {
    min: Math.min(...bs.map(b => b.x1)),
    max: Math.max(...bs.map(b => b.x2)),
  }
})

function x(day: number): number {
  const { min, max } = extents.value
  if (max === min) return 0
  return ((day - min) / (max - min)) * viewWidth
}

const bands = computed(() => store.observationBands)
</script>

<style scoped>
.profile-obs-band { width: 100%; }
</style>
