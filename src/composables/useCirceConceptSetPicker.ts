import { computed, ref, type Ref } from 'vue'
import { convertAtlasItemToCirce, nextConceptSetId } from '@/components/cohort-editor/atlas-concept-set'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useNotifications } from '@/stores/notifications'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/utils/logger'
import type { ConceptSet } from '@/models/circe-types'
import { provideReusableInsertHost } from '@/components/reusables/reusable-insert-host'
import type { ReusableCatalogRoot } from '@/components/reusables/reusable-catalog'
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
 * It also makes the same list the target of "From Reusable" insertions for
 * every criteria editor below the calling component (see reusable-insert-host).
 *
 * @param opts.getConceptSets  returns the current expression-level concept-set list
 * @param opts.addConceptSet   called when a selected concept set is new to the list
 * @param opts.allowReusables  false to offer no "From Reusable" insertion below
 *                             (the reusable editor itself)
 * @param opts.getReusableCatalog  where imported reusables are kept; without it
 *                             reusables are inserted as plain copies
 */
export function useCirceConceptSetPicker(opts: {
  getConceptSets: () => ConceptSet[]
  addConceptSet: (cs: ConceptSet) => void
  onConceptSetChanged?: () => void
  allowReusables?: boolean
  getReusableCatalog?: () => ReusableCatalogRoot | undefined
}) {
  const conceptSetsStore = useConceptSetsStore()
  const notify = useNotifications()
  const { tv } = useI18n()

  provideReusableInsertHost(
    opts.allowReusables === false
      ? null
      : {
          getConceptSets: opts.getConceptSets,
          addConceptSet: opts.addConceptSet,
          onInserted: opts.onConceptSetChanged,
          getCatalogRoot: opts.getReusableCatalog,
        }
  )

  const pickerOpen = ref(false)
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
    pickerOpen.value = !!target
  }

  function hideSelectionDialog() {
    pickerOpen.value = false
  }

  function cancelSelection() {
    activeRequest = null
    pickerOpen.value = false
  }

  function resolveSelection(selectedId: number) {
    if (!activeRequest) return
    activeRequest.targetRef.value = selectedId
    opts.onConceptSetChanged?.()
    activeRequest = null
    pickerOpen.value = false
  }

  async function onConceptSetSelected(conceptSet: {
    id: number | string
    name: string
    items?: unknown[]
  }) {
    if (!activeRequest) {
      pickerOpen.value = false
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
        notify.danger(
          tv('components.cohortBuilder.conceptSetLoadFailed', { name: conceptSet.name }),
          { message: conceptSetsStore.error ?? undefined }
        )
        cancelSelection()
        return
      }

      items = fetched.items ?? []
    }

    const missingIds = items.filter(item => item.missingFromVocabulary).map(item => item.conceptId)
    if (missingIds.length > 0) {
      notify.warning(
        tv('components.cohortBuilder.conceptSetMissingConcepts', { name: conceptSet.name }),
        {
          message: tv('components.cohortBuilder.conceptSetMissingConceptsDetail', { ids: missingIds.join(', ') }),
        }
      )
    }

    // An imported set is a copy owned by the expression, so it always gets the
    // next local codeset id. The repository id is never reused: the two id
    // spaces are unrelated and would otherwise collide with existing sets.
    const codesetId = nextConceptSetId(opts.getConceptSets())

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
    pickerOpen,
    conceptSetOptions,
    onSelectConceptSet: openSelection,
    onLocalConceptSetSelected,
    onConceptSetSelected,
    hideSelectionDialog,
    resolveSelection,
    cancelSelection,
  }
}
