import { computed, ref } from 'vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { ConceptSet, ConceptSetItem } from '@/components/cohort-editor/circe.types'
import type {
  ConceptSetOption,
  ConceptSetSelectionTarget,
} from '@/components/cohort-editor/criteria/criteria-editor.types'

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
  // Not reactive — captured only during an async selection operation.
  let activeTarget: ConceptSetSelectionTarget | null = null

  const conceptSetOptions = computed<ConceptSetOption[]>(() =>
    opts
      .getConceptSets()
      .filter((cs): cs is ConceptSet & { id: number } => typeof cs.id === 'number')
      .map(cs => ({ id: cs.id, name: cs.name ?? '' })),
  )

  function onSelectConceptSet(target: ConceptSetSelectionTarget | undefined) {
    activeTarget = target ?? null
    dialogOpen.value = true
  }

  async function onConceptSetSelected(conceptSet: {
    id: number | string
    name: string
    items?: unknown[]
  }) {
    const target = activeTarget
    if (!target) {
      dialogOpen.value = false
      return
    }

    const numericId = typeof conceptSet.id === 'string' ? Number(conceptSet.id) : conceptSet.id

    // Fetch full items if not provided, matching CohortBuilder behavior.
    let items = conceptSet.items ?? []
    if (items.length === 0 && numericId != null) {
      await conceptSetsStore.fetchOne(numericId)
      if (conceptSetsStore.currentSet?.id !== undefined) {
        items = conceptSetsStore.currentSet.items ?? []
      }
    }

    // Add to expression-level concept sets if not already present.
    if (!opts.getConceptSets().some(cs => cs.id === numericId)) {
      opts.addConceptSet({
        id: numericId,
        name: conceptSet.name,
        // items come from ConceptSetsStore which matches the circe ConceptSetItem shape.
        expression: { items: items as ConceptSetItem[] },
      })
    }

    // Write the chosen ID directly into the CriteriaGroup's field ref.
    target.targetRef.value = numericId

    activeTarget = null
    dialogOpen.value = false
  }

  return {
    dialogOpen,
    conceptSetOptions,
    onSelectConceptSet,
    onConceptSetSelected,
  }
}
