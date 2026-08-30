/**
 * The Updated column across the four analysis lists (characterizations,
 * incidence rates, pathways, feature analyses).
 *
 * WebAPI leaves modifiedDate unset until an asset is edited. Both the cell and
 * the sort now read the creation date in that case, so a freshly created
 * analysis is not shown as Unknown and does not sink to the bottom of a
 * most-recently-updated list (#292).
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import AnalysisDataTable from '@/components/analysis/AnalysisDataTable.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Updated', key: 'modifiedDate' },
]

const items = [
  { id: 1, name: 'Edited months ago', createdDate: '2026-01-01T00:00:00Z', modifiedDate: '2026-04-01T00:00:00Z' },
  { id: 2, name: 'Just created', createdDate: '2026-06-01T00:00:00Z', modifiedDate: null },
]

function mountTable() {
  return mount(AnalysisDataTable, {
    global: { plugins: [vuetify] },
    props: { headers, items, testid: 'analysis-table' },
  })
}

function rowNames(wrapper: ReturnType<typeof mountTable>) {
  return wrapper.findAll('tbody tr').map(r => r.findAll('td')[0]!.text().trim())
}

describe('AnalysisDataTable Updated column (#292)', () => {
  it('does not report a never-modified analysis as Unknown', () => {
    const wrapper = mountTable()
    expect(wrapper.text()).not.toContain('Unknown')
  })

  it('opens with the most recently touched analysis first, creation date included', () => {
    expect(rowNames(mountTable())).toEqual(['Just created', 'Edited months ago'])
  })
})
