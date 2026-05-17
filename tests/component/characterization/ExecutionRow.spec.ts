/**
 * ExecutionRow component tests
 *
 * Verifies status chip tone, conditional Cancel/Results buttons,
 * duration formatting, and the cancel/view-results emit contracts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import ExecutionRow from '@/components/characterization/ExecutionRow.vue'
import type { CharacterizationExecution } from '@/models/characterization.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

function makeExecution(overrides: Partial<CharacterizationExecution> = {}): CharacterizationExecution {
  return {
    id: 1,
    sourceKey: 'EUNOMIA',
    status: 'RUNNING',
    startTime: 1_700_000_000_000,
    duration: 0,
    designHash: 'abc123',
    ...overrides,
  } as CharacterizationExecution
}

function mountRow(execution: CharacterizationExecution) {
  return mount(ExecutionRow, {
    props: { execution, characterizationId: 42 },
    global: {
      plugins: [vuetify],
      stubs: {
        AtlasIcon: true,
        AtlasChip: {
          name: 'AtlasChip',
          props: ['tone', 'size', 'variant'],
          template: '<span class="atlas-chip-stub" :data-tone="tone"><slot /></span>',
        },
        AtlasButton: {
          name: 'AtlasButton',
          props: ['size', 'variant', 'tone', 'icon'],
          emits: ['click'],
          template: '<button class="atlas-button-stub" @click="$emit(\'click\', $event)"><slot /></button>',
        },
      },
    },
  })
}

describe('ExecutionRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the source key and status', () => {
    const wrapper = mountRow(makeExecution({ sourceKey: 'CCAE' }))
    expect(wrapper.text()).toContain('CCAE')
    expect(wrapper.text()).toContain('RUNNING')
  })

  it('exposes the row data-testid using the execution id', () => {
    const wrapper = mountRow(makeExecution({ id: 7 }))
    expect(wrapper.find('[data-testid="execution-row-7"]').exists()).toBe(true)
  })

  it('applies the success tone for COMPLETED executions', () => {
    const wrapper = mountRow(makeExecution({ id: 2, status: 'COMPLETED' }))
    const chip = wrapper.find('[data-testid="execution-row-status-2"]')
    expect(chip.exists()).toBe(true)
    expect(chip.attributes('data-tone')).toBe('success')
  })

  it('applies the danger tone for FAILED executions', () => {
    const wrapper = mountRow(makeExecution({ id: 3, status: 'FAILED' }))
    const chip = wrapper.find('[data-testid="execution-row-status-3"]')
    expect(chip.attributes('data-tone')).toBe('danger')
  })

  it('shows Cancel button for non-terminal executions', () => {
    const wrapper = mountRow(makeExecution({ id: 1, status: 'RUNNING' }))
    expect(wrapper.find('[data-testid="execution-row-cancel-1"]').exists()).toBe(true)
  })

  it('hides Cancel button once execution reaches a terminal state', () => {
    const wrapper = mountRow(makeExecution({ id: 1, status: 'COMPLETED' }))
    expect(wrapper.find('[data-testid="execution-row-cancel-1"]').exists()).toBe(false)
  })

  it('shows Results button only when COMPLETED', () => {
    const running = mountRow(makeExecution({ id: 1, status: 'RUNNING' }))
    expect(running.find('[data-testid="execution-row-results-1"]').exists()).toBe(false)

    const done = mountRow(makeExecution({ id: 1, status: 'COMPLETED' }))
    expect(done.find('[data-testid="execution-row-results-1"]').exists()).toBe(true)
  })

  it('emits cancel with execution id when cancel button clicked', async () => {
    const wrapper = mountRow(makeExecution({ id: 11, status: 'RUNNING' }))
    await wrapper.find('[data-testid="execution-row-cancel-11"]').trigger('click')
    expect(wrapper.emitted('cancel')).toEqual([[11]])
  })

  it('emits viewResults with execution id when results button clicked', async () => {
    const wrapper = mountRow(makeExecution({ id: 12, status: 'COMPLETED' }))
    await wrapper.find('[data-testid="execution-row-results-12"]').trigger('click')
    expect(wrapper.emitted('viewResults')).toEqual([[12]])
  })

  it('formats sub-minute duration in seconds', () => {
    const wrapper = mountRow(makeExecution({ status: 'COMPLETED', duration: 5_000 }))
    expect(wrapper.text()).toContain('5s')
  })

  it('formats multi-minute duration as Xm Ys', () => {
    const wrapper = mountRow(makeExecution({ status: 'COMPLETED', duration: 125_000 }))
    expect(wrapper.text()).toContain('2m 5s')
  })

  it('formats multi-hour duration as Xh Ym', () => {
    const wrapper = mountRow(makeExecution({ status: 'COMPLETED', duration: 3_900_000 }))
    expect(wrapper.text()).toContain('1h 5m')
  })

  it('derives duration from startTime/endTime when duration is absent', () => {
    const wrapper = mountRow(
      makeExecution({
        status: 'COMPLETED',
        duration: undefined,
        startTime: 1_000_000,
        endTime: 1_010_000,
      }),
    )
    expect(wrapper.text()).toContain('10s')
  })

  it('renders em-dash for missing startTime', () => {
    const wrapper = mountRow(makeExecution({ startTime: undefined }))
    expect(wrapper.text()).toContain('—')
  })

  it('renders em-dash duration when neither duration nor end time are present', () => {
    const wrapper = mountRow(
      makeExecution({
        status: 'RUNNING',
        duration: undefined,
        endTime: undefined,
      }),
    )
    // The duration cell should contain the em-dash placeholder.
    expect(wrapper.find('.execution-row__duration').text()).toBe('—')
  })
})
