<template>
  <div class="highlights-concept-set-list">
    <div
      v-if="store.cohortConceptSets.length === 0"
      data-test="cs-empty"
      class="text-disabled"
    >
      {{ tv('profiles.clickHereToSelectACohort', 'No cohort selected') }}
    </div>
    <AtlasList
      v-else
      density="compact"
      class="overflow-auto"
      max-height="320"
    >
      <AtlasListItem
        v-for="cs in store.cohortConceptSets"
        :key="cs.id"
      >
        <v-list-item-title>
          {{ cs.name }}
        </v-list-item-title>
        <template #append>
          <!-- TODO: wire up store.applyHighlight expansion for concept
               sets. The store needs a way to resolve a concept-set id
               to its concept-id list before this dot can drive a real
               highlight. Until then the dot is inert. -->
          <AtlasTooltip
            :text="
              tv(
                'profiles.conceptSetHighlightingComingSoon',
                'Concept-set highlighting coming soon'
              )
            "
            location="top"
          >
            <template #activator="{ props: tipProps }">
              <span
                v-bind="tipProps"
                class="color-dot color-dot--disabled"
                :data-test="`highlight-color-dot-set-${cs.id}`"
                aria-disabled="true"
              />
            </template>
          </AtlasTooltip>
        </template>
      </AtlasListItem>
    </AtlasList>
  </div>
</template>

<script setup lang="ts">
import { AtlasList, AtlasListItem, AtlasTooltip } from '@/components/ui'
import { useProfileStore } from '@/stores/profile'
import { useI18n } from '@/composables/useI18n'

const store = useProfileStore()
const { tv } = useI18n()
</script>

<style scoped>
.color-dot {
  display: inline-block;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(15, 23, 42, 0.15);
  background: rgb(var(--v-theme-surface-variant));
}
.color-dot--disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.v-theme--dark .color-dot {
  border-color: var(--atlas-color-outline-strong);
}
</style>
