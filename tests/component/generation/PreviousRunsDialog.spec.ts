import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import PreviousRunsDialog from '@/components/generation/PreviousRunsDialog.vue'
import type { RunTableExecution } from '@/components/generation/DataSourceRunTable.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

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

function mountDialog(props: Partial<{
  modelValue: boolean
  sourceName: string
  sourceKey: string
  executions: RunTableExecution[]
  selectedId: number | string | null
  loading: boolean
  latestResultOnly: boolean
}> = {}) {
  setActivePinia(createPinia())
  return mount(PreviousRunsDialog, {
    attachTo: document.body,
    global: { plugins: [vuetify, createPinia()] },
    props: {
      modelValue: true,
      sourceName: 'Truven CCAE',
      sourceKey: 'CCAE',
      executions: [],
      selectedId: null,
      loading: false,
      ...props,
    },
  })
}

describe('PreviousRunsDialog', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders a row per execution for the source', () => {
    mountDialog({
      executions: [
        exec({ id: 1, sourceKey: 'CCAE', startTime: 1 }),
        exec({ id: 2, sourceKey: 'CCAE', startTime: 2 }),
        exec({ id: 99, sourceKey: 'OTHER', startTime: 3 }),
      ],
    })
    expect(document.body.querySelector('[data-testid="view-btn-1"]')).toBeTruthy()
    expect(document.body.querySelector('[data-testid="view-btn-2"]')).toBeTruthy()
    expect(document.body.querySelector('[data-testid="view-btn-99"]')).toBeFalsy()
  })

  it('emits update:modelValue=false when underlying dialog closes', async () => {
    const w = mountDialog()
    const dialog = w.findComponent({ name: 'AtlasDialog' })
    dialog.vm.$emit('update:modelValue', false)
    await w.vm.$nextTick()
    const events = w.emitted('update:modelValue') as Array<[boolean]> | undefined
    expect(events).toBeTruthy()
    expect(events?.[events.length - 1]).toEqual([false])
  })

  it('emits select with execution id when View icon is clicked', async () => {
    const w = mountDialog({
      executions: [exec({ id: 42, sourceKey: 'CCAE', status: 'COMPLETED' })],
    })
    const btn = document.body.querySelector('[data-testid="view-btn-42"]') as HTMLElement
    expect(btn).toBeTruthy()
    btn.click()
    await w.vm.$nextTick()
    expect(w.emitted('select')?.[0]).toEqual([42])
  })

  it('disables the View icon for non-COMPLETED executions', () => {
    mountDialog({
      executions: [exec({ id: 5, sourceKey: 'CCAE', status: 'FAILED' })],
    })
    const btn = document.body.querySelector('[data-testid="view-btn-5"]') as HTMLButtonElement
    expect(btn).toBeTruthy()
    expect(btn.disabled).toBe(true)
  })

  it('shows empty state text when there are no executions for the source', () => {
    mountDialog({ executions: [] })
    expect(document.body.textContent || '').toMatch(/No previous runs/i)
  })

  it('labels the otherwise unexplained eye icon (#217)', () => {
    mountDialog({ executions: [exec({ id: 7, sourceKey: 'CCAE', status: 'COMPLETED' })] })
    const btn = document.body.querySelector('[data-testid="view-btn-7"]') as HTMLButtonElement
    expect(btn.getAttribute('aria-label')).toBe('View results')
  })

  it('explains why the icon is disabled on a run that never completed (#217)', () => {
    mountDialog({ executions: [exec({ id: 8, sourceKey: 'CCAE', status: 'FAILED' })] })
    const btn = document.body.querySelector('[data-testid="view-btn-8"]') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.getAttribute('aria-label')).toBe('Results are available only for completed runs')
  })

  it('keeps every completed run viewable by default, for analyses that retain per-run results', () => {
    mountDialog({
      executions: [
        exec({ id: 1, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 1 }),
        exec({ id: 2, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 2 }),
      ],
    })
    expect((document.body.querySelector('[data-testid="view-btn-1"]') as HTMLButtonElement).disabled).toBe(false)
    expect((document.body.querySelector('[data-testid="view-btn-2"]') as HTMLButtonElement).disabled).toBe(false)
  })

  it('under latestResultOnly, only the newest completed run stays viewable (#217)', () => {
    // Cohort results are keyed by cohort + source, so each generation
    // overwrites the last and older runs have nothing left to show.
    mountDialog({
      latestResultOnly: true,
      executions: [
        exec({ id: 1, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 1 }),
        exec({ id: 2, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 2 }),
        exec({ id: 3, sourceKey: 'CCAE', status: 'FAILED', startTime: 3 }),
      ],
    })
    const older = document.body.querySelector('[data-testid="view-btn-1"]') as HTMLButtonElement
    const newest = document.body.querySelector('[data-testid="view-btn-2"]') as HTMLButtonElement

    expect(newest.disabled).toBe(false)
    expect(newest.getAttribute('aria-label')).toBe('View results')
    expect(older.disabled).toBe(true)
    expect(older.getAttribute('aria-label')).toBe(
      'Superseded: only the most recent run keeps its results'
    )
  })

  it('under latestResultOnly, a later FAILED run does not steal viewability from the newest completed one', () => {
    mountDialog({
      latestResultOnly: true,
      executions: [
        exec({ id: 1, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 1 }),
        exec({ id: 2, sourceKey: 'CCAE', status: 'FAILED', startTime: 5 }),
      ],
    })
    expect((document.body.querySelector('[data-testid="view-btn-1"]') as HTMLButtonElement).disabled).toBe(false)
    expect((document.body.querySelector('[data-testid="view-btn-2"]') as HTMLButtonElement).disabled).toBe(true)
  })
})
