import { describe, it, expect, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { toCirceConcepts, useCriteriaConceptSearch } from '@/composables/useCriteriaConceptSearch'
import { useCriteriaSelection, type CriteriaSelectionService } from '@/composables/useCriteriaSelection'
import type { Concept as SearchConcept } from '@/models/concept-set.types'

const male = {
  conceptId: 8507,
  conceptName: 'MALE',
  standardConcept: 'S',
  invalidReason: 'V',
  conceptCode: 'M',
  domainId: 'Gender',
  vocabularyId: 'Gender',
  conceptClassId: 'Gender',
} as unknown as SearchConcept

function mountHost() {
  let state!: ReturnType<typeof useCriteriaConceptSearch>
  let injected: CriteriaSelectionService | null = null
  const Child = defineComponent({
    setup() {
      injected = useCriteriaSelection()
      return () => h('span')
    },
  })
  const Host = defineComponent({
    setup() {
      state = useCriteriaConceptSearch()
      return () => h(Child)
    },
  })
  mount(Host)
  return { state, service: injected as CriteriaSelectionService | null }
}

describe('useCriteriaConceptSearch', () => {
  it('provides the criteria selection service to descendants', () => {
    const { service } = mountHost()
    expect(service).not.toBeNull()
  })

  it('opens the dialog with the requested domain filter', () => {
    const { state, service } = mountHost()
    service!.requestConcepts('Gender', vi.fn())
    expect(state.conceptSearchOpen.value).toBe(true)
    expect(state.conceptSearchDomainFilter.value).toBe('Gender')
  })

  it('delivers Circe-format concepts to the requester and closes the dialog', () => {
    const { state, service } = mountHost()
    const onSelect = vi.fn()
    service!.requestConcepts('Gender', onSelect)

    state.onConceptsSelected([male])

    expect(state.conceptSearchOpen.value).toBe(false)
    expect(onSelect).toHaveBeenCalledWith(toCirceConcepts([male]))
    expect(onSelect.mock.calls[0][0][0]).toMatchObject({
      CONCEPT_ID: 8507,
      CONCEPT_NAME: 'MALE',
      STANDARD_CONCEPT_CAPTION: 'Standard',
      DOMAIN_ID: 'Gender',
    })
  })

  it('does not invoke the callback for an empty selection', () => {
    const { state, service } = mountHost()
    const onSelect = vi.fn()
    service!.requestConcepts('Gender', onSelect)

    state.onConceptsSelected([])

    expect(onSelect).not.toHaveBeenCalled()
    expect(state.conceptSearchOpen.value).toBe(false)
  })
})
