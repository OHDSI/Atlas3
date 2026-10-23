import { describe, it, expect, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import {
  provideCriteriaSelection,
  useCriteriaSelection,
  type CriteriaSelectionService,
} from '@/composables/useCriteriaSelection'
import type { Concept } from '@/models/event.types'

function makeService(): CriteriaSelectionService {
  return {
    requestConcepts: vi.fn(),
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

  it('passes concept search callbacks through to the service owner', () => {
    const received: {
      domainFilter?: string | undefined
      conceptsCb?: (concepts: Concept[]) => void
    } = {}
    const service: CriteriaSelectionService = {
      requestConcepts: (domainFilter, cb) => {
        received.domainFilter = domainFilter
        received.conceptsCb = cb
      },
    }

    const applied: unknown[] = []
    const Consumer = defineComponent({
      setup() {
        const selection = useCriteriaSelection()
        selection?.requestConcepts('Gender', concepts => applied.push(concepts))
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

    // The owner received the request and can deliver results back through
    // the callback, which applies at the requesting component.
    expect(received.domainFilter).toBe('Gender')
    const concepts = [{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' } as unknown as Concept]
    received.conceptsCb?.(concepts)
    expect(applied).toEqual([concepts])
  })
})
