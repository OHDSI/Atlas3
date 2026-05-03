<template>
  <AtlasCard padding="md">
    <div class="section-header">
      <div class="section-header__title-row">
        <span class="text-eyebrow">OBSERVATION</span>
        <span class="section-header__rule" />
        <h2 class="section-title">
          Observation periods
        </h2>
      </div>
    </div>
    <div class="section-body">
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
        <div
          v-if="bands.length === 0"
          class="profile-obs-band__empty"
          data-test="profile-obs-band-empty"
        >
          <v-icon
            icon="mdi-information-outline"
            size="14"
          />
          <span>No observation periods recorded</span>
        </div>
      </div>
    </div>
  </AtlasCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProfileStore } from '@/stores/profile'
import { AtlasCard } from '@/components/ui'

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
.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}
.section-header__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.section-header__rule {
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
  margin: 0;
}
.section-header__actions {
  margin-left: auto;
}

.profile-obs-band {
  width: 100%;
}
.profile-obs-band__empty {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 13px;
}
</style>
