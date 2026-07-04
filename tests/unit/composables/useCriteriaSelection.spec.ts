import { describe, it, expect, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import {
  provideCriteriaSelection,
  useCriteriaSelection,
  type CriteriaSelectionService,
} from '@/composables/useCriteriaSelection'
import type { ConceptSetReference } from '@/models/cohort.types'
import type { Concept } from '@/models/event.types'

function makeService(): CriteriaSelectionService {
  return {
    requestConceptSet: vi.fn(),
    requestConcepts: vi.fn(),
    editConceptSet: vi.fn(),
  }
}

describe('useCriteriaSelection', () => {
  it('returns the provided service at any component depth', () => {
    const service = makeService()
    let atChild: CriteriaSelectionService | null = null
    let atGrandchild: CriteriaSelectionService | null = null

    const Grandchild = defineComponent({
      setup() {
        atGrandchild = useCriteriaSelection()
        return () => h('span')
      },
    })
    const Child = defineComponent({
      setup() {
        atChild = useCriteriaSelection()
        return () => h(Grandchild)
      },
    })
    const Root = defineComponent({
      setup() {
        provideCriteriaSelection(service)
        return () => h(Child)
      },
    })

    mount(Root)

    expect(atChild).toBe(service)
    expect(atGrandchild).toBe(service)
  })

  it('returns null when no ancestor provides the service (legacy emit fallback)', () => {
    let injected: CriteriaSelectionService | null | undefined
    const Orphan = defineComponent({
      setup() {
        injected = useCriteriaSelection()
        return () => h('span')
      },
    })

    mount(Orphan)

    expect(injected).toBeNull()
  })

  it('passes selection callbacks through to the service owner', () => {
    const received: {
      conceptSetCb?: (cs: ConceptSetReference) => void
      domainFilter?: string | undefined
      conceptsCb?: (concepts: Concept[]) => void
      edited?: { id: number | string; name: string }
    } = {}
    const service: CriteriaSelectionService = {
      requestConceptSet: cb => {
        received.conceptSetCb = cb
      },
      requestConcepts: (domainFilter, cb) => {
        received.domainFilter = domainFilter
        received.conceptsCb = cb
      },
      editConceptSet: cs => {
        received.edited = cs
      },
    }

    const applied: unknown[] = []
    const Consumer = defineComponent({
      setup() {
        const selection = useCriteriaSelection()
        selection?.requestConceptSet(cs => applied.push(cs))
        selection?.requestConcepts('Gender', concepts => applied.push(concepts))
        selection?.editConceptSet({ id: 3, name: 'Diabetes' })
        return () => h('span')
      },
    })
    const Root = defineComponent({
      setup() {
        provideCriteriaSelection(service)
        return () => h(Consumer)
      },
    })

    mount(Root)

    // The owner received the requests and can deliver results back through
    // the callbacks, which apply at the requesting component.
    expect(received.domainFilter).toBe('Gender')
    expect(received.edited).toEqual({ id: 3, name: 'Diabetes' })
    const conceptSet: ConceptSetReference = { id: 7, name: 'Hypertension', items: [] }
    received.conceptSetCb?.(conceptSet)
    const concepts = [{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' } as unknown as Concept]
    received.conceptsCb?.(concepts)
    expect(applied).toEqual([conceptSet, concepts])
  })
})
