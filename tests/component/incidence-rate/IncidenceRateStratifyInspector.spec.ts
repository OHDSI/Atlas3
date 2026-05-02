import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { vuetify, pristinePinia } from './_test-helpers'
import IncidenceRateStratifyInspector from '@/components/incidence-rate/IncidenceRateStratifyInspector.vue'

vi.mock('@/components/incidence-rate/IncidenceRateStratifyRuleEditor.vue', () => ({
  default: { name: 'IncidenceRateStratifyRuleEditor', template: '<div data-testid="stub-editor" />' },
}))

vi.mock('@/components/shared/AppDialogHeader.vue', () => ({
  default: {
    name: 'AppDialogHeader',
    emits: ['close'],
    template: '<header><button data-testid="ir-strata-inspector-close" @click="$emit(\'close\')">x</button></header>',
  },
}))

const rule = { name: 'Age band', description: '', expression: { id: 'a', logicType: 'ALL', events: [] } }

describe('IncidenceRateStratifyInspector', () => {
  it('renders the editor when modelValue=true and rule is provided', () => {
    const w = mount(IncidenceRateStratifyInspector, {
      attachTo: document.body,
      global: { plugins: [pristinePinia(), vuetify] },
      props: { modelValue: true, rule },
    })
    expect(document.body.querySelector('[data-testid="stub-editor"]')).toBeTruthy()
    w.unmount()
  })

  it('emits update:modelValue=false when the close button is clicked', async () => {
    const w = mount(IncidenceRateStratifyInspector, {
      attachTo: document.body,
      global: { plugins: [pristinePinia(), vuetify] },
      props: { modelValue: true, rule },
    })
    const btn = document.body.querySelector('[data-testid="ir-strata-inspector-close"]') as HTMLElement
    btn.click()
    expect(w.emitted('update:modelValue')).toEqual([[false]])
    w.unmount()
  })
})
