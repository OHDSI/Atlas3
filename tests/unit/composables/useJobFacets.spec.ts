import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useConceptFacets } from '@/composables/useConceptFacets'
import {
  JOB_FACETS,
  UNKNOWN_AUTHOR,
  jobAuthor,
  jobSearchIdentifiers,
  jobSearchText,
} from '@/composables/useJobFacets'
import type { Job } from '@/models/jobs.types'

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 1,
    executionId: 101,
    type: 'generateCohort',
    name: 'Diabetes cohort',
    status: 'COMPLETED',
    author: 'alice',
    startTime: null,
    endTime: null,
    duration: null,
    entityId: 7,
    sourceKey: 'SYNPUF',
    exitMessage: null,
    ...overrides,
  }
}

describe('useJobFacets', () => {
  it('searches name, type label, status label, author and source', () => {
    const text = jobSearchText(makeJob())
    expect(text).toContain('Diabetes cohort')
    expect(text).toContain('Cohort Generation')
    expect(text).toContain('Completed')
    expect(text).toContain('alice')
    expect(text).toContain('SYNPUF')
  })

  it('matches execution and entity ids as identifiers', () => {
    expect(jobSearchIdentifiers(makeJob())).toEqual([101, 7])
  })

  it('buckets jobs without an author under a placeholder', () => {
    expect(jobAuthor(makeJob({ author: '' }))).toBe(UNKNOWN_AUTHOR)
  })

  it('filters by text and by author facet', () => {
    const jobs = ref<Job[]>([
      makeJob({ id: 1, executionId: 1, name: 'Diabetes cohort', author: 'alice' }),
      makeJob({ id: 2, executionId: 2, name: 'Asthma IR', type: 'irAnalysis', author: 'bob' }),
      makeJob({ id: 3, executionId: 3, name: 'Heart failure', author: 'bob' }),
    ])
    const facets = useConceptFacets<Job>(jobs, JOB_FACETS, jobSearchText, jobSearchIdentifiers)

    facets.setFacet('author', ['bob'])
    expect(facets.filteredConcepts.value.map(j => j.id)).toEqual([2, 3])

    facets.setTextFilter('incidence')
    expect(facets.filteredConcepts.value.map(j => j.id)).toEqual([2])

    facets.clearFilters()
    expect(facets.facetOptions.value.author.map(o => o.label)).toEqual(['alice (1)', 'bob (2)'])
  })
})
