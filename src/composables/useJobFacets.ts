import type { FacetDefinition } from '@/composables/useConceptFacets'
import { JOB_STATUS_DISPLAY, JOB_TYPE_LABELS, type Job } from '@/models/jobs.types'

export const JOB_AUTHOR_FACET = 'author'
export const UNKNOWN_AUTHOR = '-'

export function jobAuthor(job: Job): string {
  return job.author || UNKNOWN_AUTHOR
}

export const JOB_FACETS: FacetDefinition<Job>[] = [
  { key: 'type', label: 'Type', display: job => JOB_TYPE_LABELS[job.type] ?? job.type },
  { key: JOB_AUTHOR_FACET, label: 'Author', display: jobAuthor },
]

export function jobSearchText(job: Job): string {
  return [
    job.name,
    JOB_TYPE_LABELS[job.type] ?? job.type,
    JOB_STATUS_DISPLAY[job.status]?.label ?? job.status,
    job.author,
    job.sourceKey ?? '',
  ].join(' ')
}

export function jobSearchIdentifiers(job: Job): (string | number | null | undefined)[] {
  return [job.executionId, job.entityId]
}
