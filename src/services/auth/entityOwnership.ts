import type { EntityAccessKind } from '@/models/auth.types'
import { logger } from '@/utils/logger'

/**
 * Bring client-side permissions back in step after the user created an entity.
 *
 * WebAPI reports per-entity grants only through `/user/me`, which the client
 * fetches at startup, so a newly created entity has no grant until the next
 * page load and the editor's Save and Delete actions stay disabled on the
 * thing the user just made.
 *
 * Two steps, in this order:
 *
 * 1. Record the current user as owner of `id`. A POST that succeeded means the
 *    server accepted them as the creator, so the buttons come alive without
 *    waiting on a second round trip.
 * 2. Re-read `/user/me`, which replaces that optimistic grant with what the
 *    server actually granted. This is what picks up the grants a create
 *    cascades into (an imported design creates cohorts and concept sets of its
 *    own) and what corrects step 1 if the server did not grant write after all.
 *
 * Step 1 is the fallback for step 2: if `/user/me` cannot be reached the
 * optimistic grant stands rather than leaving the user stuck.
 *
 * The store is imported lazily to keep the service layer free of a static
 * dependency on Pinia, matching the other store touch points in services.
 */
export async function syncAccessAfterCreate(
  kind: EntityAccessKind,
  id: string | number | null | undefined
): Promise<void> {
  if (id === null || id === undefined || id === '') return
  try {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    authStore.registerOwnedEntity(kind, id)
    await authStore.refreshUserContext()
  } catch (error) {
    // A missing Pinia context (tests, plugin sandboxes) must not fail the
    // create call that already succeeded on the server.
    logger.warn('EntityOwnership', `Failed to register ownership of ${kind} ${id}`, error)
  }
}
