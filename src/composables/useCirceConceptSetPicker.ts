import { computed, ref, type Ref } from 'vue'
import { convertAtlasItemToCirce, nextConceptSetId } from '@/components/cohort-editor/atlas-concept-set'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { logger } from '@/utils/logger'
import type { ConceptSet } from '@/models/circe-types'
import type { ConceptSetItem as AtlasConceptSetItem } from '@/models/concept-set.types'
import type {
  ConceptSetOption,
  ConceptSetSelectionTarget,
} from '@/components/circe/criteria/criteria-editor.types'

/**
 * Concept-set picker for editors that use the circe-native CriteriaGroup
 * component (e.g. StrataEditor, IncidenceRateStratifyRuleEditor).
 *
 * The new CriteriaGroup emits a `ConceptSetSelectionTarget` — a plain
 * `{ targetRef: Ref<number|undefined> }` that points directly to the field
 * in the criteria tree that should receive the chosen concept-set ID.  The
 * parent just needs to:
 *   1. Maintain a `conceptSets` list at the expression level.
 *   2. Supply `conceptSetOptions` (id+name pairs) as a prop to CriteriaGroup.
 *   3. Pass `onSelectConceptSet` to the `@select-concept-set` / `@edit-concept-set` events.
 *   4. Pass `onConceptSetSelected` to the `<ConceptSetSelectionDialog>`.
 *
 * @param opts.getConceptSets  returns the current expression-level concept-set list
 * @param opts.addConceptSet   called when a selected concept set is new to the list
 */
export function useCirceConceptSetPicker(opts: {
  getConceptSets: () => ConceptSet[]
  addConceptSet: (cs: ConceptSet) => void
  onConceptSetChanged?: () => void
}) {
  const conceptSetsStore = useConceptSetsStore()

  const dialogOpen = ref(false)
  interface SelectionRequest {
    targetRef: Ref<number | null | undefined>
  }

  // Not reactive — captured only during an async selection operation.
  let activeRequest: SelectionRequest | null = null

  const conceptSetOptions = computed<ConceptSetOption[]>(() =>
    opts
      .getConceptSets()
      .filter((cs): cs is ConceptSet & { id: number } => typeof cs.id === 'number')
      .map(cs => ({ id: cs.id, name: cs.name ?? '' })),
  )

  function openSelection(target: ConceptSetSelectionTarget | undefined) {
    activeRequest = target ? { targetRef: target.targetRef } : null
    dialogOpen.value = !!target
  }

  function hideSelectionDialog() {
    dialogOpen.value = false
  }

  function cancelSelection() {
    activeRequest = null
    dialogOpen.value = false
  }

  function resolveSelection(selectedId: number) {
    if (!activeRequest) return
    activeRequest.targetRef.value = selectedId
    opts.onConceptSetChanged?.()
    activeRequest = null
    dialogOpen.value = false
  }

  async function onConceptSetSelected(conceptSet: {
    id: number | string
    name: string
    items?: unknown[]
  }) {
    if (!activeRequest) {
      dialogOpen.value = false
      return
    }

    const numericId = typeof conceptSet.id === 'string' ? Number(conceptSet.id) : conceptSet.id
    if (typeof numericId !== 'number' || Number.isNaN(numericId)) {
      cancelSelection()
      return
    }

    // Fetch full items for repository imports, then materialize the chosen set
    // into the cohort expression before completing the shared assignment step.
    let items: AtlasConceptSetItem[] = (conceptSet.items ?? []) as AtlasConceptSetItem[]
    if (items.length === 0) {
      await conceptSetsStore.fetchOne(numericId)

      // A failed fetch is indistinguishable from a genuinely empty set by item
      // count alone, and materializing the unresolved set would save a codeset
      // that matches nothing. fetchOne clears `error` up front and nulls
      // `currentSet` on failure, so success is "no error and currentSet is the
      // set we asked for" — an empty set that did resolve is still accepted.
      const fetched = conceptSetsStore.currentSet
      if (conceptSetsStore.error || fetched?.id !== numericId) {
        logger.error('useCirceConceptSetPicker', 'Concept set fetch failed, selection cancelled', {
          id: numericId,
          error: conceptSetsStore.error,
        })
        cancelSelection()
        return
      }

      items = fetched.items ?? []
    }

    const existing = opts.getConceptSets().find(cs => cs.id === numericId)

    // Repository ids and the expression's local codeset ids are separate number
    // spaces that happen to overlap: circe numbers ConceptSets from 0, and a
    // WebAPI concept set id can land in the same range. Reusing the repository
    // id when a different set already holds it would point the criterion at
    // that other set, so a colliding import gets the next free id instead.
    //
    // Name is compared too, as the only available proxy for "is this the set
    // already in the expression, re-picked" versus "a different set that
    // happens to collide". It cannot tell apart two distinct repository sets
    // that share both an id collision and a display name; that case is
    // treated as a re-pick and silently reuses the existing entry.
    if (existing && existing.name === conceptSet.name) {
      resolveSelection(numericId)
      return
    }

    const codesetId = existing ? nextConceptSetId(opts.getConceptSets()) : numericId

    opts.addConceptSet({
      id: codesetId,
      name: conceptSet.name,
      expression: { items: items.map(convertAtlasItemToCirce) },
    })

    resolveSelection(codesetId)
  }

  function onLocalConceptSetSelected(conceptSet: {
    id: number | string
    name: string
    items?: unknown[]
  }) {
    if (!activeRequest) {
      cancelSelection()
      return
    }

    const numericId = typeof conceptSet.id === 'string' ? Number(conceptSet.id) : conceptSet.id
    if (typeof numericId !== 'number' || Number.isNaN(numericId)) {
      cancelSelection()
      return
    }

    resolveSelection(numericId)
  }

  return {
    dialogOpen,
    conceptSetOptions,
    onSelectConceptSet: openSelection,
    onLocalConceptSetSelected,
    onConceptSetSelected,
    hideSelectionDialog,
    resolveSelection,
    cancelSelection,
  }
}
