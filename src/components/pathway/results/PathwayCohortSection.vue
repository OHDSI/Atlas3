<template>
  <AtlasCard
    padding="none"
    class="pathway-cohort-section"
    :data-testid="testid"
  >
    <div class="pathway-cohort-section__header">
      <button
        class="pathway-cohort-section__toggle"
        type="button"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        <AtlasIcon
          icon="mdi-chevron-down"
          size="18"
          class="pathway-cohort-section__chevron"
          :class="{ 'pathway-cohort-section__chevron--collapsed': !expanded }"
        />
        <span class="text-eyebrow">{{ cohortName }}</span>
        <span class="pathway-cohort-section__accent-rule" />
      </button>
    </div>
    <div
      v-if="expanded"
      class="pathway-cohort-section__body"
    >
      <slot />
    </div>
  </AtlasCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { AtlasCard, AtlasIcon } from '@/components/ui'

defineProps<{
  cohortName: string
  testid?: string
}>()

const expanded = ref(true)
</script>

<style scoped>
.pathway-cohort-section { margin-bottom: 16px; }
.pathway-cohort-section__header { padding: 16px 20px 8px; }
.pathway-cohort-section__toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 0;
}
.pathway-cohort-section__toggle:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.pathway-cohort-section__chevron {
  color: rgba(var(--v-theme-on-surface), 0.62);
  transition: transform 0.15s ease;
}
.pathway-cohort-section__chevron--collapsed { transform: rotate(-90deg); }
.pathway-cohort-section__accent-rule {
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
}
.pathway-cohort-section__body { padding: 0 20px 20px; }
</style>
