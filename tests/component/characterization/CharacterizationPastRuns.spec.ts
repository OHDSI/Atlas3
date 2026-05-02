import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import CharacterizationPastRuns from '@/components/characterization/CharacterizationPastRuns.vue'
import type { CharacterizationExecution } from '@/models/characterization.types'

const vuetify = createVuetify({ components, directives })

beforeEach(() => setActivePinia(createPinia()))

const RUN: (overrides: Partial<CharacterizationExecution>) => CharacterizationExecution =
  (overrides) => ({
    id: 1, sourceKey: 'CCAE', status: 'COMPLETED',
    startTime: 0, executionDuration: 1000, ...overrides,
  } as CharacterizationExecution)

function shallow(props: { runs: CharacterizationExecution[]; activeId: number | null }) {
  return mount(CharacterizationPastRuns, {
    global: { plugins: [vuetify] },
    props,
  })
}

describe('CharacterizationPastRuns', () => {
  it('shows empty hint when no runs', () => {
    const w = shallow({ runs: [], activeId: null })
    expect(w.text()).toMatch(/None yet|No runs/i)
  })

  it('renders one row per run', () => {
    const w = shallow({
      runs: [RUN({ id: 1 }), RUN({ id: 2, status: 'STARTED' })],
      activeId: 1,
    })
    expect(w.findAll('[data-testid="char-past-run-row"]')).toHaveLength(2)
  })

  it('emits select with id on click of completed run', async () => {
    const w = shallow({ runs: [RUN({ id: 5 })], activeId: null })
    await w.find('[data-testid="char-past-run-row"]').trigger('click')
    expect(w.emitted('select')?.[0]).toEqual([5])
  })

  it('does not emit for non-COMPLETED runs', async () => {
    const w = shallow({ runs: [RUN({ id: 5, status: 'STARTED' })], activeId: null })
    await w.find('[data-testid="char-past-run-row"]').trigger('click')
    expect(w.emitted('select')).toBeUndefined()
  })
})
