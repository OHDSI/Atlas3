import type { EntityAccessKind } from '@/models/auth.types'
import { logger } from '@/utils/logger'

/**
 * Grant the current user ownership of an entity that was just created.
 *
 * WebAPI only reports per-entity grants through `/user/me`, which the client
 * fetches at startup. A POST that succeeds means the server accepted the user
 * as the creator, so the grant is recorded locally rather than making the user
 * reload the page before they can save or delete what they just created.
 *
 * The store is imported lazily to keep the service layer free of a static
 * dependency on Pinia, matching the other store touch points in services.
 */
export async function registerCreatedEntity(
  kind: EntityAccessKind,
  id: string | number | null | undefined
): Promise<void> {
  if (id === null || id === undefined || id === '') return
  try {
    const { useAuthStore } = await import('@/stores/auth')
    useAuthStore().registerOwnedEntity(kind, id)
  } catch (error) {
    // A missing Pinia context (tests, plugin sandboxes) must not fail the
    // create call that already succeeded on the server.
    logger.warn('EntityOwnership', `Failed to register ownership of ${kind} ${id}`, error)
  }
}
