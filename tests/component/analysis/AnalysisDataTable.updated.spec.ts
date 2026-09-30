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
import { AtlasDataTable } from '@/components/ui'

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

  it('forwards ordered sort changes and removes order-less Vuetify sort items', async () => {
    const wrapper = mountTable()

    wrapper.findComponent(AtlasDataTable).vm.$emit('update:sortBy', [
      { key: 'name', order: 'desc' },
      { key: 'description' },
    ])
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:sortBy')).toEqual([[
      [{ key: 'name', order: 'desc' }],
    ]])
  })

  it('renders tags, truncates descriptions, and applies action permissions', () => {
    const wrapper = mount(AnalysisDataTable, {
      global: { plugins: [vuetify] },
      props: {
        headers: [
          ...headers,
          { title: 'Description', key: 'description' },
          { title: 'Actions', key: 'actions' },
        ],
        testid: 'analysis-table',
        items: [{
          id: 1,
          name: 'Restricted analysis',
          description: 'A description longer than the configured display limit',
          tags: [
            { name: 'First', color: '#ffffff' },
            { name: 'Second', color: '#000000' },
            { name: 'Third', color: '#888888' },
          ],
        }],
        descriptionLimit: 12,
        maxVisibleTags: 2,
        canOpenItem: () => false,
        canCopyItem: () => false,
        canDeleteItem: () => false,
      },
    })

    expect(wrapper.get('[data-testid="analysis-table-row-name"]').text()).toBe('Restricted analysis')
    expect(wrapper.find('a[data-testid="analysis-table-row-name"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('A descriptio…')
    expect(wrapper.text()).toContain('First')
    expect(wrapper.text()).toContain('Second')
    expect(wrapper.get('.analysis-data-table__tag-overflow').text()).toBe('+1')
    expect(wrapper.findAll('.analysis-data-table__row-actions button')).toHaveLength(2)
  })

  it('forwards a consumer item slot that is not owned by the table', () => {
    const wrapper = mount(AnalysisDataTable, {
      global: { plugins: [vuetify] },
      props: {
        headers: [...headers, { title: 'Custom', key: 'custom' }],
        items: [{ id: 1, name: 'Custom column', custom: 'value' }],
      },
      slots: {
        'item.custom': '<span class="custom-cell">custom value</span>',
      },
    })

    expect(wrapper.get('.custom-cell').text()).toBe('custom value')
  })

  it('renders empty and loading states', () => {
    const emptyWrapper = mount(AnalysisDataTable, {
      global: { plugins: [vuetify] },
      props: { headers, items: [], emptyText: 'Nothing here' },
    })
    const loadingWrapper = mount(AnalysisDataTable, {
      global: { plugins: [vuetify] },
      props: { headers, items: [], loading: true },
    })

    expect(emptyWrapper.text()).toContain('Nothing here')
    expect(loadingWrapper.findAll('.analysis-data-table__skeleton')).toHaveLength(5)
  })

  it('forwards open, copy, and delete row actions', async () => {
    const wrapper = mount(AnalysisDataTable, {
      global: { plugins: [vuetify] },
      props: {
        headers: [...headers, { title: 'Actions', key: 'actions' }],
        items: [{ id: 1, name: 'Editable analysis' }],
      },
    })

    await wrapper.get('.analysis-data-table__name-link').trigger('click')
    const actions = wrapper.findAll('.analysis-data-table__row-actions button')
    await actions[0]!.trigger('click')
    await actions[1]!.trigger('click')
    await actions[2]!.trigger('click')

    expect(wrapper.emitted('open')).toHaveLength(2)
    expect(wrapper.emitted('copy')).toHaveLength(1)
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  it('synchronizes a parent sort and formats created dates and users', async () => {
    const wrapper = mount(AnalysisDataTable, {
      global: { plugins: [vuetify] },
      props: {
        headers: [
          ...headers,
          { title: 'Created', key: 'createdDate' },
          { title: 'Created by', key: 'createdBy' },
          { title: 'Description', key: 'description' },
        ],
        items: [
          { id: 1, name: 'Known fields', createdDate: 0, createdBy: { login: 'owner' } },
          { id: 2, name: 'Missing fields' },
        ],
      },
    })

    await wrapper.setProps({ sortBy: [{ key: 'name', order: 'asc' }] })

    expect(wrapper.findComponent(AtlasDataTable).props('sortBy')).toEqual([{ key: 'name', order: 'asc' }])
    expect(wrapper.text()).toContain('owner')
    expect(wrapper.text()).toContain('Unknown')
    expect(wrapper.text()).toContain('—')
  })
})
