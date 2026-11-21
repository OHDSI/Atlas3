import type { Reusable } from '@/models/reusable.types'

/** Display name of a WebAPI user ref, which is a login string or a user object. */
export function reusableAuthorName(createdBy: Reusable['createdBy']): string {
  if (!createdBy) return '—'
  if (typeof createdBy === 'string') return createdBy || '—'
  return createdBy.name || createdBy.login || '—'
}

/** Login of a WebAPI user ref, for "my designs" filtering. */
export function reusableAuthorLogin(createdBy: Reusable['createdBy']): string | undefined {
  if (!createdBy) return undefined
  if (typeof createdBy === 'string') return createdBy || undefined
  return createdBy.login || undefined
}
