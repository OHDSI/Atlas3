<template>
  <AtlasCard
    padding="md"
    class="profile-demographics"
    data-test="profile-demographics"
  >
    <div class="stat-strip">
      <div class="stat-strip__item">
        <div class="stat-strip__label">
          {{ tv('profiles.gender', 'Gender') }}
        </div>
        <div class="stat-strip__value stat-strip__value--with-icon">
          <v-icon
            :icon="genderIcon"
            size="20"
            data-test="profile-gender-icon"
          />
          <span>{{ genderLabel }}</span>
        </div>
      </div>

      <div class="stat-strip__separator" />

      <div class="stat-strip__item">
        <div class="stat-strip__label">
          {{ tv('profiles.birthYear', 'Birth Year') }}
        </div>
        <div
          class="stat-strip__value"
          data-test="profile-yob"
        >
          {{ store.person?.yearOfBirth ?? '—' }}
        </div>
      </div>

      <div class="stat-strip__separator" />

      <div class="stat-strip__item">
        <div class="stat-strip__label">
          {{ tv('profiles.age', 'Age') }}
        </div>
        <v-tooltip
          location="bottom"
          :text="ageTooltip"
        >
          <template #activator="{ props: tooltipProps }">
            <div
              v-bind="tooltipProps"
              class="stat-strip__value"
              data-test="profile-age"
            >
              {{ ageValue }}
            </div>
          </template>
        </v-tooltip>
      </div>

      <div class="stat-strip__separator" />

      <div class="stat-strip__item">
        <div class="stat-strip__label">
          {{ tv('profiles.events', 'Events') }}
        </div>
        <div
          class="stat-strip__value"
          data-test="profile-count"
        >
          {{ eventCount }}
        </div>
      </div>
    </div>
  </AtlasCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProfileStore } from '@/stores/profile'
import { useI18n } from '@/composables/useI18n'
import { AtlasCard } from '@/components/ui'

const store = useProfileStore()
const { tv } = useI18n()

const genderIcon = computed<string>(() => {
  switch ((store.person?.gender ?? '').toUpperCase()) {
    case 'FEMALE':
      return 'mdi-gender-female'
    case 'MALE':
      return 'mdi-gender-male'
    default:
      return 'mdi-help-circle-outline'
  }
})

const genderLabel = computed<string>(() => {
  const raw = store.person?.gender ?? ''
  if (!raw) return '—'
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
})

const ageValue = computed<string>(() => {
  const age = store.person?.ageAtIndex
  return typeof age === 'number' ? String(age) : '—'
})

const ageTooltip = computed<string>(() =>
  store.hasCohortContext
    ? tv('profiles.ageAtIndexTooltip', 'Age at cohort index date')
    : tv('profiles.ageAtObservationStartTooltip', 'Age at start of observation')
)

const eventCount = computed<string>(() => {
  const count = store.person?.recordCount
  return typeof count === 'number' ? count.toLocaleString() : '—'
})
</script>

<style scoped>
.profile-demographics {
  /* SurfaceCard provides the elevation + padding. The strip itself
   * is just a flex row of stat columns separated by hairlines. */
}

.stat-strip {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0;
}

.stat-strip__item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 8px 24px;
  flex: 1 1 0;
  min-width: 0;
}

.stat-strip__item:first-child {
  padding-left: 0;
}

.stat-strip__item:last-child {
  padding-right: 0;
}

.stat-strip__label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--v-theme-on-surface-variant));
  font-weight: 500;
  line-height: 1.2;
}

.stat-strip__value {
  font-size: 20px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.3;
}

.stat-strip__value--with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-strip__separator {
  width: 1px;
  align-self: stretch;
  background-color: rgba(var(--v-theme-on-surface-variant), 0.24);
  flex: 0 0 auto;
}
</style>
