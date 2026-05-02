import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach } from 'vitest'
import PathwayPastRuns from '@/components/pathway/PathwayPastRuns.vue'
import type { PathwayExecution } from '@/models/pathway.types'

const vuetify = createVuetify({ components, directives })

const runs: PathwayExecution[] = [
  { id: 4231, status: 'COMPLETED', sourceKey: 'SYNPUF', executionDate: Date.now() - 1000 * 60 * 60 * 2 },
  { id: 4189, status: 'COMPLETED', sourceKey: 'CCAE', executionDate: Date.now() - 1000 * 60 * 60 * 24 * 3 },
  { id: 4150, status: 'FAILED', sourceKey: 'MDCD', executionDate: Date.now() - 1000 * 60 * 60 * 24 * 7 },
]

function mountIt(props: { runs: PathwayExecution[]; activeId: number | null }) {
  return mount(PathwayPastRuns, {
    props,
    global: { plugins: [vuetify] },
  })
}

describe('PathwayPastRuns', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders an empty hint when no runs exist', () => {
    const w = mountIt({ runs: [], activeId: null })
    expect(w.text()).toMatch(/None yet|No runs/i)
  })

  it('renders one row per run with id and source', () => {
    const w = mountIt({ runs, activeId: null })
    const rows = w.findAll('[data-testid="past-run-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.text()).toContain('4231')
    expect(rows[0]!.text()).toContain('SYNPUF')
  })

  it('marks the active run with the active class', () => {
    const w = mountIt({ runs, activeId: 4231 })
    const rows = w.findAll('[data-testid="past-run-row"]')
    expect(rows[0]!.classes()).toContain('past-run--active')
    expect(rows[1]!.classes()).not.toContain('past-run--active')
  })

  it('emits select with the run id when a row is clicked', async () => {
    const w = mountIt({ runs, activeId: null })
    await w.findAll('[data-testid="past-run-row"]')[1]!.trigger('click')
    expect(w.emitted().select?.[0]).toEqual([4189])
  })

  it('does not emit select for failed runs', async () => {
    const w = mountIt({ runs, activeId: null })
    await w.findAll('[data-testid="past-run-row"]')[2]!.trigger('click')
    expect(w.emitted().select).toBeUndefined()
  })
})
