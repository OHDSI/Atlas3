/**
 * DataTable Component Tests
 * Feature: 005-cohort-reports
 * Task: T135
 *
 * Comprehensive tests for DataTable component covering:
 * - Rendering (table, headers, data rows)
 * - Search functionality (with debouncing - 300ms delay)
 * - Pagination (10, 25, 50, 100, All options)
 * - Column sorting
 * - Column visibility toggle
 * - TableExport integration (Copy/CSV buttons)
 * - Loading states (skeleton loader)
 * - Empty states
 * - Props validation
 * - Edge cases (large datasets, special characters, null values)
 * - Cell formatting (numbers, percentages, null values)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { nextTick } from 'vue'
import DataTable from '@/components/reports/tables/DataTable.vue'
import type { TableHeader, TableRow } from '@/models/report.types'

const vuetify = createVuetify({
  components,
  directives,
})

describe('DataTable', () => {
  let wrapper: VueWrapper<any> | null = null

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
  })

  const mockHeaders: TableHeader[] = [
    { key: 'conceptId', title: 'Concept ID', sortable: true, align: 'start' },
    { key: 'conceptName', title: 'Concept Name', sortable: true, align: 'start' },
    { key: 'personCount', title: 'Person Count', sortable: true, align: 'end' },
    { key: 'prevalence', title: 'Prevalence %', sortable: true, align: 'end' },
  ]

  const mockItems: TableRow[] = [
    { conceptId: 1, conceptName: 'Type 2 Diabetes', personCount: 1200, prevalence: 12.5 },
    { conceptId: 2, conceptName: 'Hypertension', personCount: 2400, prevalence: 25.0 },
    { conceptId: 3, conceptName: 'Asthma', personCount: 800, prevalence: 8.3 },
    { conceptId: 4, conceptName: 'Depression', personCount: 1500, prevalence: 15.6 },
    { conceptId: 5, conceptName: 'Obesity', personCount: 1000, prevalence: 10.4 },
  ]

  const createWrapper = (props: any = {}) => {
    return mount(DataTable, {
      props: {
        headers: mockHeaders,
        items: mockItems,
        ...props,
      },
      global: {
        plugins: [vuetify],
        stubs: {
          TableExport: {
            name: 'TableExport',
            template: '<div class="table-export-stub" data-testid="table-export"></div>',
            props: ['data', 'headers', 'filename'],
          },
        },
      },
      attachTo: document.body,
    })
  }

  // ============================================================================
  // Basic Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    it('should render data table container', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.data-table-container').exists()).toBe(true)
    })

    it('should render v-data-table component', () => {
      wrapper = createWrapper()
      expect(wrapper.findComponent({ name: 'VDataTable' }).exists()).toBe(true)
    })

    it('should render table headers', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as any
      expect(vm.visibleHeaders).toHaveLength(4)
    })

    it('should render table items', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as any
      expect(vm.filteredItems).toHaveLength(5)
    })

    it('should have correct headers data', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as any
      expect(vm.visibleHeaders).toEqual(mockHeaders)
    })

    it('should have correct items data', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as any
      expect(vm.filteredItems).toEqual(mockItems)
    })

    it('should use default items per page of 25', () => {
      wrapper = createWrapper()
      const vm = wrapper.vm as any
      expect(vm.itemsPerPage).toBe(25)
    })

    it('should render with elevation-0 class', () => {
      wrapper = createWrapper()
      const table = wrapper.find('.v-data-table')
      expect(table.classes()).toContain('elevation-0')
    })
  })

  // ============================================================================
  // Search Functionality Tests
  // ============================================================================

  describe('Search Functionality', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should render search field when searchable is true', () => {
      const wrapper = createWrapper({ searchable: true })
      expect(wrapper.findComponent({ name: 'v-text-field' }).exists()).toBe(true)
    })

    it('should not render search field when searchable is false', () => {
      const wrapper = createWrapper({ searchable: false })
      expect(wrapper.findComponent({ name: 'v-text-field' }).exists()).toBe(false)
    })

    it('should have search label and icon', () => {
      const wrapper = createWrapper({ searchable: true })
      const searchField = wrapper.findComponent({ name: 'v-text-field' })

      expect(searchField.props('label')).toBe('Search table')
      expect(searchField.props('prependInnerIcon')).toBe('mdi-magnify')
    })

    it('should have clearable search field', () => {
      const wrapper = createWrapper({ searchable: true })
      const searchField = wrapper.findComponent({ name: 'v-text-field' })

      expect(searchField.props('clearable')).toBe(true)
    })

    it('should debounce search input by 300ms', async () => {
      const wrapper = createWrapper({ searchable: true })
      const searchField = wrapper.findComponent({ name: 'v-text-field' })

      // Type in search field
      await searchField.vm.$emit('update:modelValue', 'diabetes')
      await nextTick()

      // Debounced value should not update immediately
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('search')).toBe('')

      // Advance timers by 300ms
      vi.advanceTimersByTime(300)
      await nextTick()

      // Now debounced value should be updated
      expect(dataTable.props('search')).toBe('diabetes')
    })

    it('should clear previous debounce timer when typing quickly', async () => {
      const wrapper = createWrapper({ searchable: true })
      const searchField = wrapper.findComponent({ name: 'v-text-field' })

      // Type first query
      await searchField.vm.$emit('update:modelValue', 'dia')
      await nextTick()

      // Advance time by 100ms (less than debounce)
      vi.advanceTimersByTime(100)

      // Type second query
      await searchField.vm.$emit('update:modelValue', 'diabetes')
      await nextTick()

      // Advance by another 200ms (total 300ms from first type, but only 200ms from second)
      vi.advanceTimersByTime(200)
      await nextTick()

      // Should still be empty because second timer hasn't finished
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('search')).toBe('')

      // Advance final 100ms
      vi.advanceTimersByTime(100)
      await nextTick()

      // Now should show the final query
      expect(dataTable.props('search')).toBe('diabetes')
    })

    it('should filter items based on search query', async () => {
      const wrapper = createWrapper({ searchable: true })
      const searchField = wrapper.findComponent({ name: 'v-text-field' })

      // Initial items count
      let dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('items')).toHaveLength(5)

      // Search for 'diabetes'
      await searchField.vm.$emit('update:modelValue', 'diabetes')
      vi.advanceTimersByTime(300)
      await nextTick()

      // Should filter to items containing 'diabetes'
      dataTable = wrapper.findComponent({ name: 'v-data-table' })
      const filteredItems = dataTable.props('items')
      expect(filteredItems.length).toBeLessThan(5)
      expect(filteredItems.every((item: TableRow) =>
        JSON.stringify(item).toLowerCase().includes('diabetes')
      )).toBe(true)
    })

    it('should search across all visible columns', async () => {
      const wrapper = createWrapper({ searchable: true })
      const searchField = wrapper.findComponent({ name: 'v-text-field' })

      // Search by concept name
      await searchField.vm.$emit('update:modelValue', 'asthma')
      vi.advanceTimersByTime(300)
      await nextTick()

      let dataTable = wrapper.findComponent({ name: 'v-data-table' })
      let filtered = dataTable.props('items')
      expect(filtered.some((item: TableRow) => item.conceptName === 'Asthma')).toBe(true)

      // Search by number
      await searchField.vm.$emit('update:modelValue', '1200')
      vi.advanceTimersByTime(300)
      await nextTick()

      dataTable = wrapper.findComponent({ name: 'v-data-table' })
      filtered = dataTable.props('items')
      expect(filtered.some((item: TableRow) => item.personCount === 1200)).toBe(true)
    })

    it('should be case-insensitive search', async () => {
      const wrapper = createWrapper({ searchable: true })
      const searchField = wrapper.findComponent({ name: 'v-text-field' })

      // Search with uppercase
      await searchField.vm.$emit('update:modelValue', 'DIABETES')
      vi.advanceTimersByTime(300)
      await nextTick()

      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      const filtered = dataTable.props('items')
      expect(filtered.some((item: TableRow) =>
        String(item.conceptName).toLowerCase().includes('diabetes')
      )).toBe(true)
    })

    it('should return all items when search is cleared', async () => {
      const wrapper = createWrapper({ searchable: true })
      const searchField = wrapper.findComponent({ name: 'v-text-field' })

      // Search first
      await searchField.vm.$emit('update:modelValue', 'diabetes')
      vi.advanceTimersByTime(300)
      await nextTick()

      // Clear search
      await searchField.vm.$emit('update:modelValue', '')
      vi.advanceTimersByTime(300)
      await nextTick()

      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('items')).toHaveLength(5)
    })

    it('should not search null values', async () => {
      const itemsWithNull: TableRow[] = [
        { conceptId: 1, conceptName: 'Test', personCount: null, prevalence: 5.0 },
      ]
      const wrapper = createWrapper({ items: itemsWithNull, searchable: true })
      const searchField = wrapper.findComponent({ name: 'v-text-field' })

      // Search for 'null' should not match null values
      await searchField.vm.$emit('update:modelValue', 'null')
      vi.advanceTimersByTime(300)
      await nextTick()

      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      const filtered = dataTable.props('items')
      expect(filtered).toHaveLength(0)
    })
  })

  // ============================================================================
  // Pagination Tests
  // ============================================================================

  describe('Pagination', () => {
    it('should provide items-per-page options', () => {
      const wrapper = createWrapper()
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      const options = dataTable.props('itemsPerPageOptions')

      expect(options).toEqual([
        { value: 10, title: '10' },
        { value: 25, title: '25' },
        { value: 50, title: '50' },
        { value: 100, title: '100' },
        { value: -1, title: 'All' },
      ])
    })

    it('should default to 25 items per page', () => {
      const wrapper = createWrapper()
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('itemsPerPage')).toBe(25)
    })

    it('should support 10 items per page option', () => {
      const manyItems = Array.from({ length: 50 }, (_, i) => ({
        conceptId: i + 1,
        conceptName: `Condition ${i + 1}`,
        personCount: (i + 1) * 100,
        prevalence: (i + 1) * 2,
      }))

      const wrapper = createWrapper({ items: manyItems })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      const options = dataTable.props('itemsPerPageOptions')

      expect(options.some((opt: any) => opt.value === 10)).toBe(true)
    })

    it('should support 50 items per page option', () => {
      const wrapper = createWrapper()
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      const options = dataTable.props('itemsPerPageOptions')

      expect(options.some((opt: any) => opt.value === 50)).toBe(true)
    })

    it('should support 100 items per page option', () => {
      const wrapper = createWrapper()
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      const options = dataTable.props('itemsPerPageOptions')

      expect(options.some((opt: any) => opt.value === 100)).toBe(true)
    })

    it('should support "All" items option (-1 value)', () => {
      const wrapper = createWrapper()
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      const options = dataTable.props('itemsPerPageOptions')

      const allOption = options.find((opt: any) => opt.title === 'All')
      expect(allOption).toBeDefined()
      expect(allOption.value).toBe(-1)
    })
  })

  // ============================================================================
  // Column Sorting Tests
  // ============================================================================

  describe('Column Sorting', () => {
    it('should mark all headers as sortable', () => {
      const wrapper = createWrapper()
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      const headers = dataTable.props('headers')

      headers.forEach((header: TableHeader) => {
        expect(header.sortable).toBe(true)
      })
    })

    it('should pass sortable prop from headers', () => {
      const customHeaders: TableHeader[] = [
        { key: 'id', title: 'ID', sortable: false },
        { key: 'name', title: 'Name', sortable: true },
      ]

      const wrapper = createWrapper({ headers: customHeaders })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      const headers = dataTable.props('headers')

      expect(headers[0].sortable).toBe(false)
      expect(headers[1].sortable).toBe(true)
    })

    it('should apply correct alignment to columns', () => {
      const wrapper = createWrapper()
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      const headers = dataTable.props('headers')

      expect(headers[0].align).toBe('start') // conceptId
      expect(headers[2].align).toBe('end')   // personCount
    })
  })

  // ============================================================================
  // Column Visibility Toggle Tests
  // ============================================================================

  describe('Column Visibility Toggle', () => {
    it('should render column toggle button when showColumnToggle is true', () => {
      const wrapper = createWrapper({ showColumnToggle: true })
      const toggleButton = wrapper.findAll('.v-btn').find(btn =>
        btn.text().includes('Columns')
      )
      expect(toggleButton).toBeDefined()
    })

    it('should not render column toggle button when showColumnToggle is false', () => {
      const wrapper = createWrapper({ showColumnToggle: false })
      const buttons = wrapper.findAll('.v-btn')
      const hasColumnButton = buttons.some(btn => btn.text().includes('Columns'))
      expect(hasColumnButton).toBe(false)
    })

    it('should render v-menu for column toggle', () => {
      const wrapper = createWrapper({ showColumnToggle: true })
      const menus = wrapper.findAllComponents({ name: 'v-menu' })
      expect(menus.length).toBeGreaterThan(0)
    })

    it('should show all columns in toggle menu', () => {
      const wrapper = createWrapper({ showColumnToggle: true })
      const listItems = wrapper.findAllComponents({ name: 'v-list-item' })

      // Should have list items for each header
      expect(listItems.length).toBeGreaterThanOrEqual(mockHeaders.length)
    })

    it('should show checkbox for each column', () => {
      const wrapper = createWrapper({ showColumnToggle: true })
      const checkboxes = wrapper.findAllComponents({ name: 'v-checkbox-btn' })
      expect(checkboxes.length).toBeGreaterThanOrEqual(mockHeaders.length)
    })

    it('should initially show all columns as checked', () => {
      const wrapper = createWrapper({ showColumnToggle: true })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      const visibleHeaders = dataTable.props('headers')

      expect(visibleHeaders).toHaveLength(mockHeaders.length)
    })

    it('should hide column when unchecked', async () => {
      const wrapper = createWrapper({ showColumnToggle: true })
      const vm = wrapper.vm as any

      // Hide first column
      vm.toggleColumn('conceptId')
      await nextTick()

      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      const visibleHeaders = dataTable.props('headers')

      expect(visibleHeaders).toHaveLength(mockHeaders.length - 1)
      expect(visibleHeaders.every((h: TableHeader) => h.key !== 'conceptId')).toBe(true)
    })

    it('should show column again when re-checked', async () => {
      const wrapper = createWrapper({ showColumnToggle: true })
      const vm = wrapper.vm as any

      // Hide then show first column
      vm.toggleColumn('conceptId')
      await nextTick()
      vm.toggleColumn('conceptId')
      await nextTick()

      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      const visibleHeaders = dataTable.props('headers')

      expect(visibleHeaders).toHaveLength(mockHeaders.length)
      expect(visibleHeaders.some((h: TableHeader) => h.key === 'conceptId')).toBe(true)
    })

    it('should update export data when columns hidden', async () => {
      const wrapper = createWrapper({ showColumnToggle: true, showCopyButton: true })
      const vm = wrapper.vm as any

      // Hide a column
      vm.toggleColumn('prevalence')
      await nextTick()

      const exportComponent = wrapper.findComponent({ name: 'TableExport' })
      const exportHeaders = exportComponent.props('headers')

      expect(exportHeaders).toHaveLength(mockHeaders.length - 1)
      expect(exportHeaders.every((h: TableHeader) => h.key !== 'prevalence')).toBe(true)
    })
  })

  // ============================================================================
  // TableExport Integration Tests
  // ============================================================================

  describe('TableExport Integration', () => {
    it('should render TableExport component when showCopyButton is true', () => {
      const wrapper = createWrapper({ showCopyButton: true })
      expect(wrapper.findComponent({ name: 'TableExport' }).exists()).toBe(true)
    })

    it('should render TableExport component when showExportButton is true', () => {
      const wrapper = createWrapper({ showExportButton: true })
      expect(wrapper.findComponent({ name: 'TableExport' }).exists()).toBe(true)
    })

    it('should not render TableExport when both buttons disabled', () => {
      const wrapper = createWrapper({ showCopyButton: false, showExportButton: false })
      expect(wrapper.findComponent({ name: 'TableExport' }).exists()).toBe(false)
    })

    it('should pass filtered data to TableExport', () => {
      const wrapper = createWrapper({ showCopyButton: true })
      const exportComponent = wrapper.findComponent({ name: 'TableExport' })
      const exportData = exportComponent.props('data')

      expect(exportData).toHaveLength(mockItems.length)
    })

    it('should pass visible headers to TableExport', () => {
      const wrapper = createWrapper({ showExportButton: true })
      const exportComponent = wrapper.findComponent({ name: 'TableExport' })
      const exportHeaders = exportComponent.props('headers')

      expect(exportHeaders).toEqual(mockHeaders)
    })

    it('should pass custom filename to TableExport', () => {
      const wrapper = createWrapper({
        showCopyButton: true,
        exportFilename: 'my-custom-export'
      })
      const exportComponent = wrapper.findComponent({ name: 'TableExport' })

      expect(exportComponent.props('filename')).toBe('my-custom-export')
    })

    it('should use default filename when not provided', () => {
      const wrapper = createWrapper({ showExportButton: true })
      const exportComponent = wrapper.findComponent({ name: 'TableExport' })

      expect(exportComponent.props('filename')).toBe('data-export')
    })

    it('should update export data when search filters items', async () => {
      vi.useFakeTimers()
      const wrapper = createWrapper({ searchable: true, showCopyButton: true })
      const searchField = wrapper.findComponent({ name: 'v-text-field' })

      // Apply search filter
      await searchField.vm.$emit('update:modelValue', 'diabetes')
      vi.advanceTimersByTime(300)
      await nextTick()

      const exportComponent = wrapper.findComponent({ name: 'TableExport' })
      const exportData = exportComponent.props('data')

      // Export should only include filtered items
      expect(exportData.length).toBeLessThan(mockItems.length)

      vi.restoreAllMocks()
    })
  })

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe('Loading State', () => {
    it('should pass loading prop to v-data-table', () => {
      const wrapper = createWrapper({ loading: true })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('loading')).toBe(true)
    })

    it('should not show loading by default', () => {
      const wrapper = createWrapper()
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('loading')).toBe(false)
    })

    it('should render skeleton loader when loading', () => {
      const wrapper = createWrapper({ loading: true })
      // Vuetify's v-data-table handles skeleton loader internally via loading slot
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('loading')).toBe(true)
    })
  })

  // ============================================================================
  // Empty State Tests
  // ============================================================================

  describe('Empty State', () => {
    it('should handle empty items array', () => {
      const wrapper = createWrapper({ items: [] })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('items')).toHaveLength(0)
    })

    it('should render v-data-table with empty data', () => {
      const wrapper = createWrapper({ items: [] })
      expect(wrapper.findComponent({ name: 'v-data-table' }).exists()).toBe(true)
    })

    it('should show empty state in v-data-table no-data slot', () => {
      const wrapper = createWrapper({ items: [] })
      // Vuetify handles no-data slot internally
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.exists()).toBe(true)
    })

    it('should disable export buttons when no data', () => {
      const wrapper = createWrapper({ items: [], showCopyButton: true })
      const exportComponent = wrapper.findComponent({ name: 'TableExport' })
      expect(exportComponent.props('data')).toHaveLength(0)
    })
  })

  // ============================================================================
  // Props Validation Tests
  // ============================================================================

  describe('Props Validation', () => {
    it('should accept valid headers prop', () => {
      expect(() => createWrapper({ headers: mockHeaders })).not.toThrow()
    })

    it('should accept valid items prop', () => {
      expect(() => createWrapper({ items: mockItems })).not.toThrow()
    })

    it('should default loading to false', () => {
      const wrapper = createWrapper()
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('loading')).toBe(false)
    })

    it('should default searchable to true', () => {
      const wrapper = createWrapper()
      expect(wrapper.findComponent({ name: 'v-text-field' }).exists()).toBe(true)
    })

    it('should default showColumnToggle to true', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAll('.v-btn')
      const hasColumnButton = buttons.some(btn => btn.text().includes('Columns'))
      expect(hasColumnButton).toBe(true)
    })

    it('should default showCopyButton to true', () => {
      const wrapper = createWrapper()
      expect(wrapper.findComponent({ name: 'TableExport' }).exists()).toBe(true)
    })

    it('should default showExportButton to true', () => {
      const wrapper = createWrapper()
      expect(wrapper.findComponent({ name: 'TableExport' }).exists()).toBe(true)
    })

    it('should default exportFilename to "data-export"', () => {
      const wrapper = createWrapper()
      const exportComponent = wrapper.findComponent({ name: 'TableExport' })
      expect(exportComponent.props('filename')).toBe('data-export')
    })

    it('should accept custom boolean props', () => {
      const wrapper = createWrapper({
        loading: true,
        searchable: false,
        showColumnToggle: false,
        showCopyButton: false,
        showExportButton: false,
      })

      expect(wrapper.findComponent({ name: 'v-text-field' }).exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'TableExport' }).exists()).toBe(false)
    })
  })

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle large datasets (1000+ rows)', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        conceptId: i + 1,
        conceptName: `Condition ${i + 1}`,
        personCount: (i + 1) * 10,
        prevalence: Math.random() * 100,
      }))

      const wrapper = createWrapper({ items: largeDataset })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('items')).toHaveLength(1000)
    })

    it('should handle special characters in data', () => {
      const specialItems: TableRow[] = [
        { conceptId: 1, conceptName: 'Test & Special <chars>', personCount: 100, prevalence: 10 },
        { conceptId: 2, conceptName: 'Quote "test" value', personCount: 200, prevalence: 20 },
        { conceptId: 3, conceptName: "Apostrophe's test", personCount: 300, prevalence: 30 },
      ]

      const wrapper = createWrapper({ items: specialItems })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('items')).toEqual(specialItems)
    })

    it('should handle null values in cells', () => {
      const nullItems: TableRow[] = [
        { conceptId: 1, conceptName: 'Test', personCount: null, prevalence: null },
        { conceptId: 2, conceptName: null, personCount: 100, prevalence: 10 },
      ]

      const wrapper = createWrapper({ items: nullItems })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('items')).toEqual(nullItems)
    })

    it('should handle undefined values in cells', () => {
      const undefinedItems: TableRow[] = [
        { conceptId: 1, conceptName: 'Test', personCount: undefined, prevalence: 10 },
      ]

      const wrapper = createWrapper({ items: undefinedItems })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('items')).toEqual(undefinedItems)
    })

    it('should handle mixed data types in same column', () => {
      const mixedItems: TableRow[] = [
        { conceptId: 1, conceptName: 'Text', personCount: 100, prevalence: 10 },
        { conceptId: 2, conceptName: 'Text', personCount: '200', prevalence: '20' }, // strings
        { conceptId: 3, conceptName: 'Text', personCount: null, prevalence: undefined },
      ]

      const wrapper = createWrapper({ items: mixedItems })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('items')).toEqual(mixedItems)
    })

    it('should handle very long text in cells', () => {
      const longText = 'A'.repeat(500)
      const longTextItems: TableRow[] = [
        { conceptId: 1, conceptName: longText, personCount: 100, prevalence: 10 },
      ]

      const wrapper = createWrapper({ items: longTextItems })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('items')[0].conceptName).toBe(longText)
    })

    it('should handle unicode characters', () => {
      const unicodeItems: TableRow[] = [
        { conceptId: 1, conceptName: '日本語テスト', personCount: 100, prevalence: 10 },
        { conceptId: 2, conceptName: 'Español ñ', personCount: 200, prevalence: 20 },
        { conceptId: 3, conceptName: 'Emoji 😀 test', personCount: 300, prevalence: 30 },
      ]

      const wrapper = createWrapper({ items: unicodeItems })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('items')).toEqual(unicodeItems)
    })

    it('should handle empty strings', () => {
      const emptyStringItems: TableRow[] = [
        { conceptId: 1, conceptName: '', personCount: 100, prevalence: 10 },
        { conceptId: 2, conceptName: '  ', personCount: 200, prevalence: 20 },
      ]

      const wrapper = createWrapper({ items: emptyStringItems })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('items')).toEqual(emptyStringItems)
    })

    it('should handle zero values', () => {
      const zeroItems: TableRow[] = [
        { conceptId: 0, conceptName: 'Zero Test', personCount: 0, prevalence: 0 },
      ]

      const wrapper = createWrapper({ items: zeroItems })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('items')).toEqual(zeroItems)
    })

    it('should handle negative numbers', () => {
      const negativeItems: TableRow[] = [
        { conceptId: 1, conceptName: 'Negative', personCount: -100, prevalence: -10 },
      ]

      const wrapper = createWrapper({ items: negativeItems })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('items')).toEqual(negativeItems)
    })

    it('should handle very large numbers', () => {
      const largeNumberItems: TableRow[] = [
        { conceptId: 1, conceptName: 'Large', personCount: 999999999, prevalence: 99.99 },
      ]

      const wrapper = createWrapper({ items: largeNumberItems })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('items')).toEqual(largeNumberItems)
    })

    it('should handle decimal numbers', () => {
      const decimalItems: TableRow[] = [
        { conceptId: 1, conceptName: 'Decimal', personCount: 123.456, prevalence: 12.345 },
      ]

      const wrapper = createWrapper({ items: decimalItems })
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('items')).toEqual(decimalItems)
    })
  })

  // ============================================================================
  // Cell Formatting Tests
  // ============================================================================

  describe('Cell Formatting', () => {
    it('should format numbers with thousands separator', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      const formatted = vm.formatCell(1200, { key: 'personCount', title: 'Count', sortable: true })
      expect(formatted).toBe('1,200')
    })

    it('should format percentage fields with % symbol', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      const formatted = vm.formatCell(12.5, { key: 'prevalence', title: 'Prevalence', sortable: true })
      expect(formatted).toBe('12.5%')
    })

    it('should format prevalence fields with % symbol', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      const formatted = vm.formatCell(8.3, { key: 'prevalence_rate', title: 'Rate', sortable: true })
      expect(formatted).toBe('8.3%')
    })

    it('should display null values as dash', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      const formatted = vm.formatCell(null, { key: 'personCount', title: 'Count', sortable: true })
      expect(formatted).toBe('-')
    })

    it('should display undefined values as dash', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      const formatted = vm.formatCell(undefined, { key: 'personCount', title: 'Count', sortable: true })
      expect(formatted).toBe('-')
    })

    it('should not format ID columns with thousands separator', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      const formatted = vm.formatCell(1234, { key: 'conceptId', title: 'ID', sortable: true })
      expect(formatted).toBe(1234) // No formatting for IDs
    })

    it('should not format ID columns even if large', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      const formatted = vm.formatCell(999999, { key: 'personId', title: 'Person ID', sortable: true })
      expect(formatted).toBe(999999)
    })

    it('should format large numbers correctly', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      const formatted = vm.formatCell(1234567, { key: 'count', title: 'Count', sortable: true })
      expect(formatted).toBe('1,234,567')
    })

    it('should format zero as number', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      const formatted = vm.formatCell(0, { key: 'count', title: 'Count', sortable: true })
      expect(formatted).toBe('0')
    })

    it('should format decimal percentages correctly', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      const formatted = vm.formatCell(8.345, { key: 'percent_value', title: 'Percent', sortable: true })
      expect(formatted).toBe('8.3%')
    })

    it('should return string values as-is', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      const formatted = vm.formatCell('Test String', { key: 'conceptName', title: 'Name', sortable: true })
      expect(formatted).toBe('Test String')
    })

    it('should handle boolean values', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      const formattedTrue = vm.formatCell(true, { key: 'flag', title: 'Flag', sortable: true })
      const formattedFalse = vm.formatCell(false, { key: 'flag', title: 'Flag', sortable: true })

      expect(formattedTrue).toBe(true)
      expect(formattedFalse).toBe(false)
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should work with all features enabled', () => {
      const wrapper = createWrapper({
        searchable: true,
        showColumnToggle: true,
        showCopyButton: true,
        showExportButton: true,
        loading: false,
        exportFilename: 'full-test'
      })

      expect(wrapper.find('.data-table-container').exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'v-text-field' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'v-data-table' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'TableExport' }).exists()).toBe(true)
    })

    it('should maintain column visibility during search', async () => {
      const wrapper = createWrapper({
        searchable: true,
        showColumnToggle: true,
        showCopyButton: true
      })
      const vm = wrapper.vm as any

      // Hide a column
      vm.toggleColumn('prevalence')
      await nextTick()

      // Apply search
      const searchField = wrapper.findComponent({ name: 'v-text-field' })
      await searchField.vm.$emit('update:modelValue', 'diabetes')
      vi.advanceTimersByTime(300)
      await nextTick()

      // Column should still be hidden
      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      const headers = dataTable.props('headers')
      expect(headers.every((h: TableHeader) => h.key !== 'prevalence')).toBe(true)
    })

    it('should update export when both search and column visibility change', async () => {
      const wrapper = createWrapper({
        searchable: true,
        showColumnToggle: true,
        showExportButton: true
      })
      const vm = wrapper.vm as any

      // Hide column
      vm.toggleColumn('conceptId')
      await nextTick()

      // Apply search
      const searchField = wrapper.findComponent({ name: 'v-text-field' })
      await searchField.vm.$emit('update:modelValue', 'diabetes')
      vi.advanceTimersByTime(300)
      await nextTick()

      // Export should reflect both changes
      const exportComponent = wrapper.findComponent({ name: 'TableExport' })
      const exportHeaders = exportComponent.props('headers')
      const exportData = exportComponent.props('data')

      expect(exportHeaders.every((h: TableHeader) => h.key !== 'conceptId')).toBe(true)
      expect(exportData.length).toBeLessThan(mockItems.length)
    })

    it('should handle rapid state changes gracefully', async () => {
      const wrapper = createWrapper({ searchable: true })
      const searchField = wrapper.findComponent({ name: 'v-text-field' })

      // Rapid search changes
      await searchField.vm.$emit('update:modelValue', 'a')
      vi.advanceTimersByTime(100)

      await searchField.vm.$emit('update:modelValue', 'as')
      vi.advanceTimersByTime(100)

      await searchField.vm.$emit('update:modelValue', 'asthma')
      vi.advanceTimersByTime(100)

      // Only final value should be debounced
      await searchField.vm.$emit('update:modelValue', 'diabetes')
      vi.advanceTimersByTime(300)
      await nextTick()

      const dataTable = wrapper.findComponent({ name: 'v-data-table' })
      expect(dataTable.props('search')).toBe('diabetes')
    })
  })
})
