<template>
  <div class="psp">
    <div
      v-if="error"
      class="psp__error"
    >
      <AtlasIcon
        icon="mdi-alert-circle-outline"
        size="20"
      />
      <span>{{ friendlyError }}</span>
    </div>
    <div
      v-else-if="loading"
      class="psp__loading"
    >
      <AtlasProgressCircular
        indeterminate
        size="32"
      />
    </div>
    <template v-else-if="person">
      <ProfileDemographics />
      <ProfileObservationBand />
      <div
        class="psp__timeline-row"
        :class="{ 'psp__timeline-row--with-highlights': highlightsOpen }"
      >
        <div class="psp__timeline">
          <ProfileTimeline />
        </div>
        <aside
          v-if="highlightsOpen"
          class="psp__highlights"
          :aria-label="tv('components.profileSidePanel.highlights', 'Highlights')"
        >
          <button
            type="button"
            class="psp__highlights-toggle psp__highlights-toggle--open"
            :aria-label="collapseLabel"
            data-testid="profile-highlights-collapse"
            @click="highlightsOpen = false"
          >
            <AtlasIcon
              icon="mdi-chevron-right"
              size="18"
            />
          </button>
          <HighlightsPanel />
        </aside>
        <button
          v-else
          type="button"
          class="psp__highlights-toggle psp__highlights-toggle--collapsed"
          :aria-label="expandLabel"
          data-testid="profile-highlights-expand"
          @click="highlightsOpen = true"
        >
          <AtlasIcon
            icon="mdi-chevron-left"
            size="18"
          />
          <span class="psp__highlights-toggle-label">{{ tv('components.profileSidePanel.highlights', 'Highlights') }}</span>
        </button>
      </div>
      <ProfileEventsTable />
    </template>
  </div>
</template>

<script setup lang="ts">
import { AtlasIcon, AtlasProgressCircular } from '@/components/ui'
import { computed, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import ProfileDemographics from '@/components/profile/ProfileDemographics.vue'
import ProfileObservationBand from '@/components/profile/ProfileObservationBand.vue'
import ProfileTimeline from '@/components/profile/ProfileTimeline.vue'
import ProfileEventsTable from '@/components/profile/ProfileEventsTable.vue'
import HighlightsPanel from '@/components/profile/HighlightsPanel.vue'
import { usePersonProfile } from '@/composables/usePersonProfile'

const { tv } = useI18n()

const props = defineProps<{
  sourceKey: string
  personId: string
  cohortId?: number
}>()

const params = computed(() => ({
  sourceKey: props.sourceKey,
  personId: props.personId,
  cohortId: props.cohortId !== undefined ? String(props.cohortId) : undefined,
}))

const { person, loading, error } = usePersonProfile(params)

const highlightsOpen = ref(false)
const expandLabel = tv('components.profileSidePanel.showHighlights', 'Show highlights')
const collapseLabel = tv('components.profileSidePanel.hideHighlights', 'Hide highlights')

const friendlyError = computed(() => {
  const msg = error.value ?? ''
  if (msg.includes('403')) {
    return tv(
      'components.profileSidePanel.accessDenied403',
      "You don't have access to this person's profile on this data source. Ask your admin to grant READ access to the source."
    )
  }
  return msg || tv('components.profileSidePanel.failedToLoadProfile', 'Failed to load profile.')
})
</script>

<style scoped>
.psp {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.psp__loading {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.psp__error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: rgba(var(--v-theme-error), 0.08);
  border: 1px solid rgba(var(--v-theme-error), 0.32);
  border-radius: 8px;
  color: rgb(var(--v-theme-on-surface));
}

.psp__timeline-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: stretch;
}

.psp__timeline-row--with-highlights {
  grid-template-columns: minmax(0, 1fr) 320px;
}

.psp__timeline {
  min-width: 0;
}

.psp__highlights {
  position: relative;
  min-width: 0;
}

.psp__highlights-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 6px;
  cursor: pointer;
  color: rgb(var(--v-theme-primary));
  font: inherit;
  font-size: 12px;
}

.psp__highlights-toggle:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.psp__highlights-toggle--collapsed {
  align-self: center;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  padding: 8px 4px;
}

.psp__highlights-toggle--collapsed .psp__highlights-toggle-label {
  letter-spacing: 0.04em;
}

.psp__highlights-toggle--open {
  position: absolute;
  top: 8px;
  left: -14px;
  width: 28px;
  height: 28px;
  justify-content: center;
  padding: 0;
  border-radius: 50%;
  z-index: 1;
}
</style>
