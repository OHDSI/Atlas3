/**
 * Profile Store
 * Manages person profile state, route params, filters, and highlights.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { logger } from '@/utils/logger'
import {
  type PersonProfile,
  type HighlightColor,
  type CohortConceptSet,
} from '@/models/profile.types'
import {
  getPerson,
  getCohortConceptSets,
} from '@/services/profile.service'

interface RouteParams {
  sourceKey: string | null
  personId: number | null
  cohortDefinitionId?: number | null
}

export const useProfileStore = defineStore('profile', () => {
  // route mirror
  const sourceKey = ref<string | null>(null)
  const personId = ref<number | null>(null)
  const cohortDefinitionId = ref<number | null>(null)

  // data
  const person = ref<PersonProfile | null>(null)
  const cohortConceptSets = ref<CohortConceptSet[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // filters
  const domainFilter = ref<Set<string>>(new Set<string>())
  const textFilter = ref<string>('')
  const dateRange = ref<[number, number] | null>(null)

  // highlights
  const highlights = ref<Map<number, HighlightColor>>(new Map())

  function setRouteParams(p: RouteParams) {
    const sourceChanged = p.sourceKey !== sourceKey.value
    const personChanged = p.personId !== personId.value
    sourceKey.value = p.sourceKey
    personId.value = p.personId
    cohortDefinitionId.value = p.cohortDefinitionId ?? null
    if (sourceChanged || personChanged) {
      person.value = null
      error.value = null
      domainFilter.value = new Set()
      textFilter.value = ''
      dateRange.value = null
      highlights.value = new Map()
    }
  }

  function reset() {
    person.value = null
    personId.value = null
    cohortDefinitionId.value = null
    cohortConceptSets.value = []
    error.value = null
    domainFilter.value = new Set()
    textFilter.value = ''
    dateRange.value = null
    highlights.value = new Map()
  }

  function setDomainFilter(domain: string, on: boolean) {
    const next = new Set(domainFilter.value)
    if (on) next.add(domain)
    else next.delete(domain)
    domainFilter.value = next
  }
  function setTextFilter(s: string) {
    textFilter.value = s
  }
  function setDateRange(range: [number, number] | null) {
    dateRange.value = range
  }

  function applyHighlight(conceptIds: number[], color: HighlightColor) {
    const next = new Map(highlights.value)
    for (const id of conceptIds) {
      if (color === 'none') next.delete(id)
      else next.set(id, color)
    }
    highlights.value = next
  }
  function clearHighlights() {
    highlights.value = new Map()
  }

  // placeholders filled in later tasks
  async function loadPerson(): Promise<void> {
    // Task 5 will implement this. Reference unused imports to satisfy lint:
    void getPerson
    void getCohortConceptSets
    void logger
  }

  return {
    // state
    sourceKey,
    personId,
    cohortDefinitionId,
    person,
    cohortConceptSets,
    loading,
    error,
    domainFilter,
    textFilter,
    dateRange,
    highlights,
    // actions
    setRouteParams,
    reset,
    setDomainFilter,
    setTextFilter,
    setDateRange,
    applyHighlight,
    clearHighlights,
    loadPerson,
  }
})
