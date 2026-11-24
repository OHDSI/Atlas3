/**
 * reusable-support.ts
 *
 * Whether the WebAPI this session talks to keeps reusables imported into a
 * cohort expression when it saves the cohort.
 *
 * WebAPI saves a cohort by reading the expression into circe's model and
 * writing it back, so it keeps the catalog and the references only when its
 * circe models them (OHDSI/circe-be#243). With an older circe they are
 * dropped and the uses come back as plain copies with the same logic.
 *
 * There is no way to ask WebAPI beforehand, so the first save that loses them
 * is what tells: from then on this session inserts reusables as copies, and
 * the cohort that was just saved is turned into plain copies on screen too, so
 * the editor shows what was actually saved.
 */
import { ref } from 'vue'
import type { ReusableCatalogRoot } from './reusable-catalog'

const supported = ref(true)

/** False once a save has shown that WebAPI drops references. */
export function referencesSupported(): boolean {
  return supported.value
}

export function markReferencesUnsupported(): void {
  supported.value = false
}

/** For tests. */
export function resetReferencesSupport(): void {
  supported.value = true
}

function catalogSize(root: ReusableCatalogRoot | null | undefined): number {
  return (root?.ReusableCriteria?.length ?? 0) + (root?.ReusableCriteriaGroups?.length ?? 0)
}

/**
 * Whether a save lost the catalog: what was sent had imported reusables and
 * what came back has none. A response without an expression says nothing.
 */
export function catalogDroppedOnSave(
  sent: ReusableCatalogRoot,
  saved: ReusableCatalogRoot | null | undefined
): boolean {
  if (!saved || typeof saved !== 'object') return false
  return catalogSize(sent) > 0 && catalogSize(saved) === 0
}
