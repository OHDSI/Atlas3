import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { CohortEvent, ConceptSetReference, CriteriaGroup } from '@/models/cohort.types'
import type { Concept as AtlasConcept } from '@/models/event.types'
import type { Concept as PickerConcept } from '@/models/concept-set.types'

/**
 * Payload shapes emitted by CriteriaGroupEditor's `select-concept-set`:
 * - a bare number → the group event at that index (the group's own picker),
 * - `{ eventIndex, eventId }` → an event addressed by id,
 * - `{ eventIndex, nestedEventIndex }` → a child inside that event's nested group.
 */
export type ConceptSetSelectPayload =
  | number
  | { eventIndex: number; eventId: string }
  | { eventIndex: number; nestedEventIndex: number }

export interface CriteriaGroupPicker {
  conceptSetDialogOpen: Ref<boolean>
  conceptSearchDialogOpen: Ref<boolean>
  conceptSearchDomainFilter: ComputedRef<string | undefined>
  onSelectConceptSet: (payload: ConceptSetSelectPayload) => void
  onSelectConcept: (context: {
    eventIndex: number
    attributeIndex: number
    domainFilter: string | undefined
  }) => void
  onConceptSetSelected: (conceptSet: {
    id: number | string
    name: string
    items?: unknown[]
  }) => Promise<void>
  onConceptsSelected: (concepts: PickerConcept[]) => void
}

/**
 * Concept-set / concept picking for a host that embeds a single
 * `CriteriaGroupEditor` (e.g. characterization strata, incidence-rate stratify
 * rules). Encapsulates the dialog state and writes the selection back to the
 * right event — crucially, to the *nested child* when one was targeted rather
 * than its parent (the bug fixed centrally for the cohort builder in #93). Each
 * host previously hand-rolled this, which is exactly how the targeting drifted
 * apart; share it so every host stays correct.
 *
 * @param opts.getGroup  returns the current group to read from
 * @param opts.onUpdate  receives the next group after a selection is applied
 */
export function useCriteriaGroupPicker(opts: {
  getGroup: () => CriteriaGroup
  onUpdate: (group: CriteriaGroup) => void
}): CriteriaGroupPicker {
  const conceptSetsStore = useConceptSetsStore()

  const conceptSetDialogOpen = ref(false)
  const conceptSearchDialogOpen = ref(false)
  // Captured when the editor asks for a concept set or concept, so the dialog's
  // confirmation can write back to the right event/attribute.
  const pickerContext = ref<{
    eventIndex: number
    nestedEventIndex?: number
    attributeIndex?: number
    domainFilter?: string
  } | null>(null)

  const conceptSearchDomainFilter = computed<string | undefined>(
    () => pickerContext.value?.domainFilter,
  )

  function onSelectConceptSet(payload: ConceptSetSelectPayload) {
    const eventIndex = typeof payload === 'number' ? payload : payload.eventIndex
    const nestedEventIndex =
      typeof payload === 'object' && 'nestedEventIndex' in payload
        ? payload.nestedEventIndex
        : undefined
    pickerContext.value = { eventIndex, nestedEventIndex }
    conceptSetDialogOpen.value = true
  }

  function onSelectConcept(context: {
    eventIndex: number
    attributeIndex: number
    domainFilter: string | undefined
  }) {
    pickerContext.value = {
      eventIndex: context.eventIndex,
      attributeIndex: context.attributeIndex,
      domainFilter: context.domainFilter,
    }
    conceptSearchDialogOpen.value = true
  }

  async function onConceptSetSelected(conceptSet: {
    id: number | string
    name: string
    items?: unknown[]
  }) {
    const ctx = pickerContext.value
    if (!ctx) {
      conceptSetDialogOpen.value = false
      return
    }
    // Fetch the full concept set with items so the criteria payload is
    // self-contained (matches the cohort builder's behavior).
    let full: ConceptSetReference = {
      id: conceptSet.id,
      name: conceptSet.name,
      items: conceptSet.items ?? [],
    }
    if (conceptSet.id != null && (!conceptSet.items || conceptSet.items.length === 0)) {
      await conceptSetsStore.fetchOne(conceptSet.id)
      if (conceptSetsStore.currentSet && conceptSetsStore.currentSet.id !== undefined) {
        full = {
          id: conceptSetsStore.currentSet.id,
          name: conceptSetsStore.currentSet.name,
          items: conceptSetsStore.currentSet.items ?? [],
        }
      }
    }

    const group = opts.getGroup()
    const event = group.events[ctx.eventIndex]
    if (event) {
      let updatedEvent: CohortEvent
      if (ctx.nestedEventIndex !== undefined && event.nestedCriteria) {
        // Concept set was selected for a nested child — assign it to that child,
        // not the parent event (same targeting fix as the cohort builder, #93).
        updatedEvent = {
          ...event,
          nestedCriteria: {
            ...event.nestedCriteria,
            events: event.nestedCriteria.events.map((ne, i) =>
              i === ctx.nestedEventIndex ? { ...ne, conceptSet: full } : ne,
            ),
          },
        }
      } else {
        updatedEvent = { ...event, conceptSet: full }
      }
      opts.onUpdate({
        ...group,
        events: group.events.map((e, i) => (i === ctx.eventIndex ? updatedEvent : e)),
      })
    }
    conceptSetDialogOpen.value = false
    pickerContext.value = null
  }

  function onConceptsSelected(concepts: PickerConcept[]) {
    const ctx = pickerContext.value
    if (!ctx || ctx.attributeIndex === undefined || concepts.length === 0) {
      conceptSearchDialogOpen.value = false
      pickerContext.value = null
      return
    }

    // Picker yields camelCase concepts; the cohort definition stores them in
    // Atlas's UPPERCASE shape. Convert at the boundary.
    const converted: AtlasConcept[] = concepts.map(c => ({
      CONCEPT_ID: c.conceptId,
      CONCEPT_NAME: c.conceptName,
      CONCEPT_CODE: c.conceptCode,
      DOMAIN_ID: c.domainId,
      VOCABULARY_ID: c.vocabularyId,
      CONCEPT_CLASS_ID: c.conceptClassId,
      STANDARD_CONCEPT: c.standardConcept ?? null,
      INVALID_REASON: c.invalidReason ?? null,
    }))

    const group = opts.getGroup()
    const event = group.events[ctx.eventIndex]
    if (event && event.attributes) {
      const attr = event.attributes[ctx.attributeIndex]
      if (attr && attr.type === 'concept') {
        const merged = [...(attr.concepts ?? []), ...converted]
        opts.onUpdate({
          ...group,
          events: group.events.map((e, i) => {
            if (i !== ctx.eventIndex) return e
            const attrs = (e.attributes ?? []).map((a, j) =>
              j === ctx.attributeIndex && a.type === 'concept' ? { ...a, concepts: merged } : a,
            )
            return { ...e, attributes: attrs }
          }),
        })
      }
    }
    conceptSearchDialogOpen.value = false
    pickerContext.value = null
  }

  return {
    conceptSetDialogOpen,
    conceptSearchDialogOpen,
    conceptSearchDomainFilter,
    onSelectConceptSet,
    onSelectConcept,
    onConceptSetSelected,
    onConceptsSelected,
  }
}
