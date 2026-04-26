import { computed, type ComputedRef } from 'vue'
import { useProfileStore } from '@/stores/profile'
import { DEFAULT_HIGHLIGHT_COLOR } from '@/models/profile.types'

export interface UniqueConcept {
  conceptId: number
  conceptName: string
  domain: string
  count: number
}

export interface TimelinePoint {
  conceptId: number
  conceptName: string
  startDay: number
  endDay: number | null
  color: string
}

export interface TimelineDataset {
  domain: string
  points: TimelinePoint[]
}

export function useTimelineFilters(): {
  uniqueConcepts: ComputedRef<UniqueConcept[]>
  chartSeries: ComputedRef<TimelineDataset[]>
} {
  const store = useProfileStore()

  const uniqueConcepts = computed<UniqueConcept[]>(() => {
    const map = new Map<number, UniqueConcept>()
    for (const r of store.filteredRecords) {
      const existing = map.get(r.conceptId)
      if (existing) existing.count += 1
      else map.set(r.conceptId, {
        conceptId: r.conceptId, conceptName: r.conceptName, domain: r.domain, count: 1,
      })
    }
    return Array.from(map.values())
  })

  const chartSeries = computed<TimelineDataset[]>(() => {
    const buckets = new Map<string, TimelinePoint[]>()
    for (const r of store.filteredRecords) {
      const point: TimelinePoint = {
        conceptId: r.conceptId,
        conceptName: r.conceptName,
        startDay: r.startDay,
        endDay: r.endDay,
        color: store.highlights.get(r.conceptId) ?? DEFAULT_HIGHLIGHT_COLOR,
      }
      const arr = buckets.get(r.domain)
      if (arr) {
        arr.push(point)
      } else {
        buckets.set(r.domain, [point])
      }
    }
    return Array.from(buckets.entries()).map(([domain, points]) => ({ domain, points }))
  })

  return { uniqueConcepts, chartSeries }
}
