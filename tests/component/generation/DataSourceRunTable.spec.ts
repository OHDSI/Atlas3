import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import DataSourceRunTable from '@/components/generation/DataSourceRunTable.vue'
import type {
  RunTableSource,
  RunTableExecution,
} from '@/components/generation/DataSourceRunTable.vue'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const SOURCES: RunTableSource[] = [
  { sourceKey: 'CCAE', sourceName: 'Truven CCAE' },
  { sourceKey: 'MDCD', sourceName: 'Medicaid' },
  { sourceKey: 'OPTUM', sourceName: 'Optum' },
]

function exec(overrides: Partial<RunTableExecution> = {}): RunTableExecution {
  return {
    id: 1,
    sourceKey: 'CCAE',
    status: 'COMPLETED',
    startTime: 1_700_000_000_000,
    endTime: 1_700_000_005_000,
    duration: 5_000,
    ...overrides,
  }
}

function mountTable(props: Partial<{
  sources: RunTableSource[]
  executions: RunTableExecution[]
  loading: boolean
  runDisabled: boolean
  runDisabledReason: string
  noSourcesText: string
}> = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.setUser({
    login: 'tester',
    displayName: 'tester',
    permissionIdx: { admin: ['admin:source'] },
    entityAccess: emptyEntityAccess(),
  })
  return mount(DataSourceRunTable, {
    global: { plugins: [vuetify, pinia] },
    props: {
      sources: SOURCES,
      executions: [],
      ...props,
    },
  })
}

describe('DataSourceRunTable', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders one row per source', () => {
    const w = mountTable()
    expect(w.find('[data-testid="run-btn-CCAE"]').exists()).toBe(true)
    expect(w.find('[data-testid="run-btn-MDCD"]').exists()).toBe(true)
    expect(w.find('[data-testid="run-btn-OPTUM"]').exists()).toBe(true)
  })

  it('shows Generate when source has no executions, Rerun when it has a completed one', () => {
    const w = mountTable({
      executions: [exec({ id: 1, sourceKey: 'CCAE', status: 'COMPLETED' })],
    })
    expect(w.find('[data-testid="run-btn-CCAE"]').text()).toMatch(/Rerun/i)
    expect(w.find('[data-testid="run-btn-MDCD"]').text()).toMatch(/Generate/i)
  })

  it('shows Cancel when latest execution is RUNNING and emits cancel on click', async () => {
    const w = mountTable({
      executions: [exec({ id: 7, sourceKey: 'CCAE', status: 'RUNNING' })],
    })
    const btn = w.find('[data-testid="run-btn-CCAE"]')
    expect(btn.text()).toMatch(/Cancel/i)
    await btn.trigger('click')
    expect(w.emitted('cancel')?.[0]).toEqual(['CCAE'])
    expect(w.emitted('run')).toBeUndefined()
  })

  it('emits run with the correct sourceKey when Run button clicked', async () => {
    const w = mountTable()
    await w.find('[data-testid="run-btn-MDCD"]').trigger('click')
    expect(w.emitted('run')?.[0]).toEqual(['MDCD'])
  })

  it('disables history icon when no executions for a source and emits show-history when clicked', async () => {
    const w = mountTable({
      executions: [exec({ id: 1, sourceKey: 'CCAE' })],
    })
    const mdcdHistory = w.find('[data-testid="history-btn-MDCD"]')
    expect(mdcdHistory.attributes('disabled')).toBeDefined()

    await w.find('[data-testid="history-btn-CCAE"]').trigger('click')
    expect(w.emitted('show-history')?.[0]).toEqual(['CCAE'])
  })

  it('shows count badge when source has more than one execution', () => {
    const w = mountTable({
      executions: [
        exec({ id: 1, sourceKey: 'CCAE', startTime: 1 }),
        exec({ id: 2, sourceKey: 'CCAE', startTime: 2 }),
        exec({ id: 3, sourceKey: 'CCAE', startTime: 3 }),
      ],
    })
    const badge = w.find('[data-testid="history-count-CCAE"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('3')
    expect(w.find('[data-testid="history-count-MDCD"]').exists()).toBe(false)
  })

  it('disables Run button with tooltip reason when runDisabled=true', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const authStore = useAuthStore()
    authStore.setUser({
      login: 'tester',
      displayName: 'tester',
      permissionIdx: { admin: ['admin:source'] },
      entityAccess: emptyEntityAccess(),
    })
    const w = mount(DataSourceRunTable, {
      global: {
        plugins: [vuetify, pinia],
        stubs: {
          AtlasTooltip: {
            name: 'AtlasTooltip',
            template: '<div class="tt-stub"><slot name="activator" :props="{}" /><slot /></div>',
          },
        },
      },
      props: {
        sources: SOURCES,
        executions: [],
        runDisabled: true,
        runDisabledReason: 'Save the design first',
      },
    })
    const btn = w.find('[data-testid="run-btn-CCAE"]')
    expect(btn.attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Save the design first')
  })
})

describe('DataSourceRunTable extensions', () => {
  beforeEach(() => setActivePinia(createPinia()))

  // Fixtures mirror the pre-merge tests/unit/components spec: sourceName
  // equals sourceKey here (unlike SOURCES above), which is what exercises
  // the showKey=false branch of the source-cell template.
  const EXT_SOURCES: RunTableSource[] = [
    { sourceKey: 'CCAE', sourceName: 'CCAE' },
    { sourceKey: 'MDCR', sourceName: 'MDCR' },
  ]
  const EXT_EXECUTIONS: RunTableExecution[] = [
    { id: 1, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 1, endTime: 2, personCount: 8420 },
    { id: 2, sourceKey: 'MDCR', status: 'RUNNING', startTime: 3 },
  ]

  function mountExtTable(props: Record<string, unknown> = {}) {
    const pinia = createPinia()
    setActivePinia(pinia)
    const authStore = useAuthStore()
    authStore.setUser({
      login: 'tester',
      displayName: 'tester',
      permissionIdx: { admin: ['admin:source'] },
      entityAccess: emptyEntityAccess(),
    })
    return mount(DataSourceRunTable, {
      global: { plugins: [vuetify, pinia] },
      props: {
        sources: EXT_SOURCES,
        executions: EXT_EXECUTIONS,
        ...props,
      },
    })
  }

  it('omits Patients column by default', () => {
    const w = mountExtTable()
    expect(w.text()).not.toMatch(/Patients/)
  })

  it('renders Patients column when showPatientCount=true', () => {
    const w = mountExtTable({ showPatientCount: true })
    expect(w.text()).toMatch(/Patients/)
    expect(w.text()).toContain('8,420')
  })

  it('renders extraActions buttons and emits extra-action with key+sourceKey', async () => {
    const w = mountExtTable({
      extraActions: [
        { key: 'inclusion', label: 'Inclusion report' },
        { key: 'samples', label: 'Samples' },
      ],
    })
    const incBtn = w.find('[data-testid="row-extra-inclusion-CCAE"]')
    expect(incBtn.exists()).toBe(true)
    await incBtn.trigger('click')
    const events = w.emitted('extra-action')
    expect(events?.[0]).toEqual(['inclusion', 'CCAE'])
  })

  it('respects extraActions disabledWhen', () => {
    const w = mountExtTable({
      extraActions: [
        { key: 'samples', label: 'Samples', disabledWhen: (r) => r.latestStatus !== 'COMPLETED' },
      ],
    })
    const ccae = w.find('[data-testid="row-extra-samples-CCAE"]')
    const mdcr = w.find('[data-testid="row-extra-samples-MDCR"]')
    expect(ccae.attributes('disabled')).toBeUndefined()
    expect(mdcr.attributes('disabled')).toBeDefined()
  })

  it('passes hideCancel through to row', () => {
    const w = mountExtTable({ hideCancel: true })
    const mdcrBtn = w.find('[data-testid="run-btn-MDCR"]')
    expect(mdcrBtn.text()).not.toMatch(/Cancel/i)
  })

  /**
   * Regression: OHDSI/Atlas3#276. A job that dies at startup never records a
   * startTime. Treating that as time zero sorted it behind every older run,
   * so the row kept showing the previous success and the failure vanished.
   */
  describe('latest run per source (Atlas3#276)', () => {
    function ccaeStatus(w: ReturnType<typeof mountTable>) {
      return w.findAll('tbody tr')[0]!.text()
    }

    it('prefers a failed run with no start time over an older success', () => {
      const w = mountTable({
        executions: [
          exec({ id: 1, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 1_000 }),
          exec({ id: 2, sourceKey: 'CCAE', status: 'FAILED', startTime: undefined }),
        ],
      })
      expect(ccaeStatus(w)).toContain('FAILED')
    })

    it('still prefers the most recent run when both have start times', () => {
      const w = mountTable({
        executions: [
          exec({ id: 1, sourceKey: 'CCAE', status: 'FAILED', startTime: 1_000 }),
          exec({ id: 2, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 2_000 }),
        ],
      })
      expect(ccaeStatus(w)).toContain('COMPLETED')
    })

    it('breaks a tie between two unstarted runs on the newer id', () => {
      const w = mountTable({
        executions: [
          exec({ id: 5, sourceKey: 'CCAE', status: 'FAILED', startTime: undefined }),
          exec({ id: 9, sourceKey: 'CCAE', status: 'PENDING', startTime: undefined }),
        ],
      })
      expect(ccaeStatus(w)).toContain('PENDING')
    })
  })
})
