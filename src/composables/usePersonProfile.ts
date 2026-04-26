import { watch, computed, type Ref, type ComputedRef } from 'vue'
import { useProfileStore } from '@/stores/profile'
import type { PersonProfile } from '@/models/profile.types'

export interface ProfileRouteParams {
  sourceKey?: string | string[]
  personId?: string | string[]
  cohortId?: string | string[]
}

function asString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}

export function usePersonProfile(params: Ref<ProfileRouteParams>): {
  person: ComputedRef<PersonProfile | null>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
} {
  const store = useProfileStore()

  function syncFromParams() {
    const sourceKey = asString(params.value.sourceKey) ?? null
    const personIdStr = asString(params.value.personId)
    const personId = personIdStr ? Number(personIdStr) : null
    const cohortStr = asString(params.value.cohortId)
    const cohortId = cohortStr ? Number(cohortStr) : null
    store.setRouteParams({ sourceKey, personId, cohortDefinitionId: cohortId })
    if (sourceKey && personId !== null && Number.isFinite(personId)) {
      void store.loadPerson()
    }
  }

  watch(
    [
      () => asString(params.value.sourceKey),
      () => asString(params.value.personId),
      () => asString(params.value.cohortId),
    ],
    syncFromParams,
    { immediate: true }
  )

  return {
    person: computed(() => store.person),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
  }
}
