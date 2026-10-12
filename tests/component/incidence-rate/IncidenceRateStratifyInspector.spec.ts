import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { vuetify, pristinePinia } from './_test-helpers'
import IncidenceRateStratifyInspector from '@/components/incidence-rate/IncidenceRateStratifyInspector.vue'

vi.mock('@/components/incidence-rate/IncidenceRateStratifyRuleEditor.vue', () => ({
  default: {
    name: 'IncidenceRateStratifyRuleEditor',
    props: ['rule'],
    emits: ['add-concept-set'],
    template: '<div data-testid="stub-editor"><button data-testid="mutate-draft" @click="rule.expression.Type = \'MUTATED\'">mutate</button></div>',
  },
}))

vi.mock('@/components/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui')>()
  return {
    ...actual,
    AtlasDialog: {
      name: 'AtlasDialog',
      props: ['modelValue'],
      emits: ['update:modelValue', 'close'],
      template: '<div><slot /><slot v-if="modelValue" name="actions" /><button data-testid="ir-strata-inspector-close" @click="$emit(\'update:modelValue\', false)">x</button></div>',
    },
    VNavigationDrawer: {
      name: 'VNavigationDrawer',
      props: ['modelValue', 'location', 'temporary', 'width', 'scrim'],
      template: '<div><slot /></div>',
    },
  }
})

import type { StratifyRule } from '@/models/incidence-rate.types'

const rule: StratifyRule = { name: 'Age band', description: '', expression: { Type: 'ALL', CriteriaList: [] } }

describe('IncidenceRateStratifyInspector', () => {
  it('renders the editor when modelValue=true and rule is provided', () => {
    const w = mount(IncidenceRateStratifyInspector, {
      attachTo: document.body,
      global: {
        plugins: [pristinePinia(), vuetify],
        stubs: {
          VNavigationDrawer: {
            name: 'VNavigationDrawer',
            template: '<div><slot /></div>',
          },
        },
      },
      props: { modelValue: true, rule, conceptSets: [] },
    })
    expect(document.body.querySelector('[data-testid="stub-editor"]')).toBeTruthy()
    w.unmount()
  })

  it('closes an unchanged draft without a discard confirmation', async () => {
    const w = mount(IncidenceRateStratifyInspector, {
      attachTo: document.body,
      global: {
        plugins: [pristinePinia(), vuetify],
        stubs: {
          VNavigationDrawer: {
            name: 'VNavigationDrawer',
            template: '<div><slot /></div>',
          },
        },
      },
      props: { modelValue: true, rule, conceptSets: [] },
    })
    await w.get('[data-testid="ir-strata-cancel"]').trigger('click')
    expect(w.emitted('update:modelValue')).toEqual([[false]])
    expect(w.emitted('apply')).toBeUndefined()
    expect(rule.expression.Type).toBe('ALL')
    w.unmount()
  })

  it('requires confirmation before discarding changed draft criteria', async () => {
    const w = mount(IncidenceRateStratifyInspector, {
      attachTo: document.body,
      global: {
        plugins: [pristinePinia(), vuetify],
        stubs: {
          VNavigationDrawer: {
            name: 'VNavigationDrawer',
            template: '<div><slot /></div>',
          },
        },
      },
      props: { modelValue: true, rule, conceptSets: [] },
    })
    await w.get('[data-testid="mutate-draft"]').trigger('click')
    await w.get('[data-testid="ir-strata-cancel"]').trigger('click')

    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(w.get('[data-testid="ir-strata-discard"]').exists()).toBe(true)

    await w.get('[data-testid="ir-strata-discard"]').trigger('click')
    expect(w.emitted('update:modelValue')).toEqual([[false]])
    expect(rule.expression.Type).toBe('ALL')
    w.unmount()
  })

  it('emits the edited draft when applied without mutating the supplied rule', async () => {
    const w = mount(IncidenceRateStratifyInspector, {
      attachTo: document.body,
      global: {
        plugins: [pristinePinia(), vuetify],
        stubs: {
          VNavigationDrawer: {
            name: 'VNavigationDrawer',
            template: '<div><slot /></div>',
          },
        },
      },
      props: { modelValue: true, rule, conceptSets: [] },
    })
    await w.get('[data-testid="mutate-draft"]').trigger('click')
    await w.get('[data-testid="ir-strata-apply"]').trigger('click')

    expect(rule.expression.Type).toBe('ALL')
    expect(w.emitted('apply')).toContainEqual([
      expect.objectContaining({ expression: expect.objectContaining({ Type: 'MUTATED' }) }),
    ])
    w.unmount()
  })
})
