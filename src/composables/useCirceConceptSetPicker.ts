import { computed, ref, type Ref } from 'vue'
import { convertAtlasItemToCirce } from '@/components/cohort-editor/atlas-concept-set'
import { useConceptSetsStore } from '@/stores/concept-sets'
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
    if (items.length === 0 && numericId != null) {
      await conceptSetsStore.fetchOne(numericId)
      if (conceptSetsStore.currentSet?.id === numericId) {
        items = conceptSetsStore.currentSet.items ?? []
      }
    }

    // Add to expression-level concept sets if not already present.
    if (!opts.getConceptSets().some(cs => cs.id === numericId)) {
      opts.addConceptSet({
        id: numericId,
        name: conceptSet.name,
        expression: { items: items.map(convertAtlasItemToCirce) },
      })
    }

    resolveSelection(numericId)
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
