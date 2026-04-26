/**
 * Profile Store
 * Manages person profile state, route params, filters, and highlights.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '@/utils/logger'
import {
  type PersonProfile,
  type PersonRecord,
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

  async function loadPerson(): Promise<void> {
    if (sourceKey.value === null || personId.value === null) return
    loading.value = true
    error.value = null
    try {
      const result = await getPerson(sourceKey.value, personId.value, cohortDefinitionId.value ?? undefined)
      if (result.success) {
        person.value = result.data
      } else {
        person.value = null
        error.value = result.error
      }
      if (cohortDefinitionId.value !== null) {
        const cs = await getCohortConceptSets(cohortDefinitionId.value)
        cohortConceptSets.value = cs.success ? cs.data : []
      } else {
        cohortConceptSets.value = []
      }
    } catch (err) {
      person.value = null
      error.value = err instanceof Error ? err.message : 'Failed to load profile'
      logger.error('ProfileStore', 'loadPerson failed', err)
    } finally {
      loading.value = false
    }
  }

  const filteredRecords = computed<PersonRecord[]>(() => {
    const records = person.value?.records ?? []
    const dom = domainFilter.value
    const txt = textFilter.value.trim().toLowerCase()
    const range = dateRange.value
    return records.filter(r => {
      if (dom.size > 0 && !dom.has(r.domain)) return false
      if (txt && !r.conceptName.toLowerCase().includes(txt)) return false
      if (range) {
        const [from, to] = range
        if (r.startDay < from || r.startDay > to) return false
      }
      return true
    })
  })

  const domainCounts = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = {}
    for (const r of person.value?.records ?? []) {
      counts[r.domain] = (counts[r.domain] ?? 0) + 1
    }
    return counts
  })

  const observationBands = computed<Array<{ x1: number; x2: number }>>(() => {
    return (person.value?.observationPeriods ?? []).map(p => ({ x1: p.startDays, x2: p.endDays }))
  })

  const indexDate = computed<number | null>(() => {
    const cohort = person.value?.cohorts.find(c => c.cohortDefinitionId === cohortDefinitionId.value)
    if (cohort) return cohort.startDate
    const records = person.value?.records ?? []
    if (records.length === 0) return null
    return records.reduce((m, r) => Math.min(m, r.startDate), records[0]!.startDate)
  })

  const hasCohortContext = computed(() => cohortDefinitionId.value !== null)

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
    // getters
    filteredRecords,
    domainCounts,
    observationBands,
    indexDate,
    hasCohortContext,
  }
})
