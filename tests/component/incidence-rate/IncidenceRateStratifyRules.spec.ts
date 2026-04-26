import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import IncidenceRateStratifyRules from '@/components/incidence-rate/IncidenceRateStratifyRules.vue'
import { useIncidenceRateStore } from '@/stores/incidence-rate'

const vuetify = createVuetify({ components, directives })

beforeEach(() => setActivePinia(createPinia()))

describe('IncidenceRateStratifyRules', () => {
  it('renders empty state and adds a rule', async () => {
    const store = useIncidenceRateStore()
    store.createNewIR()
    const w = mount(IncidenceRateStratifyRules, {
      global: {
        plugins: [vuetify],
        stubs: { IncidenceRateStratifyRuleEditor: true },
      },
    })
    expect(w.text()).toMatch(/No stratify rules/i)
    const addBtn = w.findAll('button').find(b => b.text().match(/Add rule/i))
    expect(addBtn).toBeDefined()
    await addBtn!.trigger('click')
    expect(store.currentIR!.expression.strata).toHaveLength(1)
  })

  it('removes a rule', async () => {
    const store = useIncidenceRateStore()
    store.createNewIR()
    store.addStratifyRule({ name: 'A', expression: {} as never })
    store.addStratifyRule({ name: 'B', expression: {} as never })
    expect(store.currentIR!.expression.strata).toHaveLength(2)
    store.removeStratifyRule(0)
    expect(store.currentIR!.expression.strata.map(r => r.name)).toEqual(['B'])
  })
})
