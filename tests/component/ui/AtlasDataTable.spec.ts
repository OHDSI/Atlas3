import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasDataTable from '@/components/ui/AtlasDataTable.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

const HEADERS = [
  { key: 'name', title: 'Name' },
  { key: 'value', title: 'Value' },
]
const ITEMS = [
  { name: 'alpha', value: 1 },
  { name: 'beta',  value: 2 },
]

function mountWith(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(AtlasDataTable, {
    global: { plugins: [vuetify] },
    props: { headers: HEADERS, items: ITEMS, ...props },
    slots,
  })
}

describe('AtlasDataTable', () => {
  it('renders v-data-table with headers + items', () => {
    const wrapper = mountWith()
    const dt = wrapper.findComponent({ name: 'VDataTable' })
    expect(dt.exists()).toBe(true)
    expect(dt.props('headers')).toEqual(HEADERS)
    expect(dt.props('items')).toEqual(ITEMS)
  })

  it('locks density to compact (cannot be overridden via $attrs)', () => {
    const wrapper = mount(AtlasDataTable, {
      global: { plugins: [vuetify] },
      props: { headers: HEADERS, items: ITEMS },
      attrs: { density: 'comfortable' },
    })
    expect(wrapper.findComponent({ name: 'VDataTable' }).props('density')).toBe('compact')
  })

  it('forwards loading prop', () => {
    const wrapper = mountWith({ loading: true })
    expect(wrapper.findComponent({ name: 'VDataTable' }).props('loading')).toBe(true)
  })

  it('forwards itemsPerPage and page', () => {
    const wrapper = mountWith({ itemsPerPage: 25, page: 2 })
    const dt = wrapper.findComponent({ name: 'VDataTable' })
    expect(dt.props('itemsPerPage')).toBe(25)
    expect(dt.props('page')).toBe(2)
  })

  it('forwards sortBy', () => {
    const sortBy = [{ key: 'name', order: 'asc' as const }]
    const wrapper = mountWith({ sortBy })
    expect(wrapper.findComponent({ name: 'VDataTable' }).props('sortBy')).toEqual(sortBy)
  })

  it('forwards height + fixedHeader for virtualised tables', () => {
    const wrapper = mountWith({ height: 600, fixedHeader: true })
    const dt = wrapper.findComponent({ name: 'VDataTable' })
    expect(dt.props('height')).toBe(600)
    expect(dt.props('fixedHeader')).toBe(true)
  })

  it('forwards #item.<column> scoped slot', () => {
    const wrapper = mountWith(
      {},
      { 'item.name': '<template #item.name="{ item }"><span class="custom">[{{ item.name }}]</span></template>' },
    )
    expect(wrapper.text()).toContain('[alpha]')
    expect(wrapper.text()).toContain('[beta]')
  })

  it('emits update:page when underlying table updates page', async () => {
    const wrapper = mountWith()
    await wrapper.findComponent({ name: 'VDataTable' }).vm.$emit('update:page', 3)
    expect(wrapper.emitted('update:page')).toEqual([[3]])
  })

  it('emits update:sortBy', async () => {
    const wrapper = mountWith()
    const newSort = [{ key: 'value', order: 'desc' }]
    await wrapper.findComponent({ name: 'VDataTable' }).vm.$emit('update:sort-by', newSort)
    expect(wrapper.emitted('update:sortBy')).toEqual([[newSort]])
  })

  it('forwards caption prop as aria-label on the underlying table', () => {
    const wrapper = mountWith({ caption: 'Concept results' })
    expect(wrapper.findComponent({ name: 'VDataTable' }).attributes('aria-label')).toBe(
      'Concept results',
    )
  })

  it('omits aria-label when caption is not provided', () => {
    const wrapper = mountWith()
    const ariaLabel = wrapper.findComponent({ name: 'VDataTable' }).attributes('aria-label')
    expect(ariaLabel === undefined || ariaLabel === '').toBe(true)
  })

  // Regression test for issues #150 / #156: clicking a sortable column
  // header did nothing when the caller only did a one-way `:sort-by`/no
  // binding at all (the common case) - `sort-by` was always forced into a
  // controlled prop, so v-data-table's own sort-state update was fed straight
  // back into the exact same static prop value on every render and never
  // took effect. When the caller doesn't bind sort-by, AtlasDataTable must
  // now own that state itself so sorting works out of the box.
  it('actually re-sorts displayed rows when the caller does not bind sortBy', async () => {
    const headers = [
      { key: 'name', title: 'Name', sortable: true },
      { key: 'value', title: 'Value', sortable: true },
    ]
    const items = [
      { name: 'beta', value: 2 },
      { name: 'alpha', value: 1 },
    ]
    const wrapper = mount(AtlasDataTable, {
      global: { plugins: [vuetify] },
      props: { headers, items },
    })

    const firstRowName = () => wrapper.findAll('tbody tr')[0]?.findAll('td')[0]?.text()
    expect(firstRowName()).toBe('beta')

    const nameHeader = wrapper.findAll('th').find(th => th.text().includes('Name'))
    expect(nameHeader).toBeTruthy()
    await nameHeader!.trigger('click')

    expect(firstRowName()).toBe('alpha')
  })

  it('still lets a caller with v-model:sort-by fully control sorting', async () => {
    const headers = [{ key: 'name', title: 'Name', sortable: true }]
    const items = [
      { name: 'beta', value: 2 },
      { name: 'alpha', value: 1 },
    ]
    const wrapper = mount(
      {
        components: { AtlasDataTable },
        template: `<AtlasDataTable :headers="headers" :items="items" v-model:sort-by="sortBy" />`,
        data: () => ({ headers, items, sortBy: [{ key: 'name', order: 'asc' }] }),
      },
      { global: { plugins: [vuetify] } },
    )

    expect(wrapper.findAll('tbody tr')[0].findAll('td')[0].text()).toBe('alpha')
    expect((wrapper.vm as unknown as { sortBy: unknown }).sortBy).toEqual([{ key: 'name', order: 'asc' }])
  })
})
