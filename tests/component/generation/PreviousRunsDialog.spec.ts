import { describe, it, expect, beforeEach, vi } from 'vitest'
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
})
