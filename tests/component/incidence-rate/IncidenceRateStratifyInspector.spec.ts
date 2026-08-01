import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { vuetify, pristinePinia } from './_test-helpers'
import IncidenceRateStratifyInspector from '@/components/incidence-rate/IncidenceRateStratifyInspector.vue'

vi.mock('@/components/incidence-rate/IncidenceRateStratifyRuleEditor.vue', () => ({
  default: { name: 'IncidenceRateStratifyRuleEditor', template: '<div data-testid="stub-editor" />' },
}))

vi.mock('@/components/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui')>()
  return {
    ...actual,
    AtlasDialog: {
      name: 'AtlasDialog',
      emits: ['update:modelValue', 'close'],
      template: '<div><slot /><button data-testid="ir-strata-inspector-close" @click="$emit(\'update:modelValue\', false)">x</button></div>',
    },
  }
})

import type { StratifyRule } from '@/models/incidence-rate.types'

const rule: StratifyRule = { name: 'Age band', description: '', expression: { Type: 'ALL', CriteriaList: [] } }

describe('IncidenceRateStratifyInspector', () => {
  it('renders the editor when modelValue=true and rule is provided', () => {
    const w = mount(IncidenceRateStratifyInspector, {
      attachTo: document.body,
      global: { plugins: [pristinePinia(), vuetify] },
      props: { modelValue: true, rule, conceptSets: [] },
    })
    expect(document.body.querySelector('[data-testid="stub-editor"]')).toBeTruthy()
    w.unmount()
  })

  it('emits update:modelValue=false when the close button is clicked', async () => {
    const w = mount(IncidenceRateStratifyInspector, {
      attachTo: document.body,
      global: { plugins: [pristinePinia(), vuetify] },
      props: { modelValue: true, rule, conceptSets: [] },
    })
    const btn = document.body.querySelector('[data-testid="ir-strata-inspector-close"]') as HTMLElement
    btn.click()
    expect(w.emitted('update:modelValue')).toEqual([[false]])
    w.unmount()
  })
})
