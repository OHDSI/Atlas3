import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { vuetify, pristinePinia } from './_test-helpers'
import IncidenceRateStratifyRulesList from '@/components/incidence-rate/IncidenceRateStratifyRulesList.vue'

const rules = [
  { name: 'Age band', expression: { id: 'a', logicType: 'ALL', events: [] } },
  { name: 'Sex',      expression: { id: 'b', logicType: 'ALL', events: [] } },
] as const

describe('IncidenceRateStratifyRulesList', () => {
  it('renders one row per rule and the empty hint when none', () => {
    const w = mount(IncidenceRateStratifyRulesList, {
      global: { plugins: [pristinePinia(), vuetify] },
      props: { rules: [...rules], readonly: false },
    })
    expect(w.findAll('[data-testid="ir-strata-row"]').length).toBe(2)

    const w2 = mount(IncidenceRateStratifyRulesList, {
      global: { plugins: [pristinePinia(), vuetify] },
      props: { rules: [], readonly: false },
    })
    expect(w2.find('[data-testid="ir-strata-empty"]').exists()).toBe(true)
  })

  it('emits edit, remove, move, add', async () => {
    const w = mount(IncidenceRateStratifyRulesList, {
      global: { plugins: [pristinePinia(), vuetify] },
      props: { rules: [...rules], readonly: false },
    })
    await w.find('[data-testid="ir-strata-edit-0"]').trigger('click')
    await w.find('[data-testid="ir-strata-remove-1"]').trigger('click')
    await w.find('[data-testid="ir-strata-down-0"]').trigger('click')
    await w.find('[data-testid="ir-strata-add"]').trigger('click')
    expect(w.emitted('edit')).toEqual([[0]])
    expect(w.emitted('remove')).toEqual([[1]])
    expect(w.emitted('move')).toEqual([[0, 1]])
    expect(w.emitted('add')).toBeTruthy()
  })
})
