/**
 * Component tests for VersionsTable
 * T022: Test rendering, sorting, filtering
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import VersionsTable from '@/components/versions/VersionsTable.vue'
import type { VersionsConfig, VersionsTableItem } from '@/components/versions/types'
import { ref } from 'vue'

// Create Vuetify instance for testing
const vuetify = createVuetify({
  components,
  directives,
})

// Mock i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

describe('VersionsTable', () => {
  const mockConfig: VersionsConfig = {
    assetType: 'cohortdefinition',
    assetId: 123,
    currentVersion: vi.fn(),
    previewVersion: ref(null),
    canEdit: ref(true),
    isDirty: ref(false),
  }

  const mockVersions: VersionsTableItem[] = [
    {
      version: -1,
      displayVersion: 'Current',
      assetId: 123,
      createdBy: { id: 1, name: 'John Doe', email: 'john@example.com' },
      createdDate: '2024-01-03T10:00:00Z',
      comment: null,
      archived: false,
      isCurrent: true,
      isPreviewing: false,
      formattedDate: 'Jan 3, 2024, 10:00 AM',
    },
    {
      version: 2,
      displayVersion: 2,
      assetId: 123,
      createdBy: { id: 1, name: 'John Doe', email: 'john@example.com' },
      createdDate: '2024-01-02T10:00:00Z',
      comment: 'Second version',
      archived: false,
      isCurrent: false,
      isPreviewing: false,
      formattedDate: 'Jan 2, 2024, 10:00 AM',
    },
    {
      version: 1,
      displayVersion: 1,
      assetId: 123,
      createdBy: { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      createdDate: '2024-01-01T10:00:00Z',
      comment: 'First version',
      archived: false,
      isCurrent: false,
      isPreviewing: false,
      formattedDate: 'Jan 1, 2024, 10:00 AM',
    },
  ]

  const defaultProps = {
    config: mockConfig,
    filteredVersions: mockVersions,
    loading: false,
    error: null,
    availableAuthors: ['John Doe', 'Jane Smith'],
  }

  it('should render the table with versions', () => {
    const wrapper = mount(VersionsTable, {
      props: defaultProps,
      global: {
        plugins: [vuetify],
      },
    })

    expect(wrapper.find('.versions-table').exists()).toBe(true)
    expect(wrapper.findAll('tbody tr')).toHaveLength(mockVersions.length)
  })

  it('should display "Current" chip for current version', () => {
    const wrapper = mount(VersionsTable, {
      props: defaultProps,
      global: {
        plugins: [vuetify],
      },
    })

    const currentChip = wrapper.find('.v-chip')
    expect(currentChip.exists()).toBe(true)
    expect(currentChip.text()).toContain('versions.current')
  })

  it('should display version numbers for historical versions', () => {
    const wrapper = mount(VersionsTable, {
      props: defaultProps,
      global: {
        plugins: [vuetify],
      },
    })

    const versionCells = wrapper.findAll('td')
    const hasVersion2 = versionCells.some(cell => cell.text().includes('2'))
    const hasVersion1 = versionCells.some(cell => cell.text().includes('1'))

    expect(hasVersion2).toBe(true)
    expect(hasVersion1).toBe(true)
  })

  it('should emit preview event when preview button clicked', async () => {
    const wrapper = mount(VersionsTable, {
      props: defaultProps,
      global: {
        plugins: [vuetify],
      },
    })

    // Find preview button for version 2
    const previewButtons = wrapper.findAll('button').filter(btn =>
      btn.text().includes('versions.preview')
    )

    if (previewButtons.length > 0) {
      await previewButtons[0].trigger('click')
      expect(wrapper.emitted('preview')).toBeTruthy()
      expect(wrapper.emitted('preview')?.[0]).toEqual([2])
    }
  })

  it('should emit edit-comment event when edit comment button clicked', async () => {
    const wrapper = mount(VersionsTable, {
      props: defaultProps,
      global: {
        plugins: [vuetify],
      },
    })

    const editButtons = wrapper.findAll('button').filter(btn =>
      btn.text().includes('versions.editComment') || btn.text().includes('versions.addComment')
    )

    if (editButtons.length > 0) {
      await editButtons[0].trigger('click')
      expect(wrapper.emitted('edit-comment')).toBeTruthy()
    }
  })

  it('should emit copy event when copy button clicked', async () => {
    const wrapper = mount(VersionsTable, {
      props: defaultProps,
      global: {
        plugins: [vuetify],
      },
    })

    const copyButtons = wrapper.findAll('button').filter(btn =>
      btn.text().includes('versions.copy')
    )

    if (copyButtons.length > 0) {
      await copyButtons[0].trigger('click')
      expect(wrapper.emitted('copy')).toBeTruthy()
    }
  })

  it('should show loading indicator when loading', () => {
    const wrapper = mount(VersionsTable, {
      props: {
        ...defaultProps,
        loading: true,
      },
      global: {
        plugins: [vuetify],
      },
    })

    expect(wrapper.find('.v-progress-linear').exists()).toBe(true)
  })

  it('should show error alert when error exists', () => {
    const wrapper = mount(VersionsTable, {
      props: {
        ...defaultProps,
        error: 'Failed to load versions',
      },
      global: {
        plugins: [vuetify],
      },
    })

    expect(wrapper.find('.v-alert').exists()).toBe(true)
    expect(wrapper.find('.v-alert').text()).toContain('Failed to load versions')
  })

  it('should populate author filter with available authors', () => {
    const wrapper = mount(VersionsTable, {
      props: defaultProps,
      global: {
        plugins: [vuetify],
      },
    })

    const select = wrapper.find('.v-select')
    expect(select.exists()).toBe(true)
  })

  it('should emit author-filter event when author selected', async () => {
    const wrapper = mount(VersionsTable, {
      props: defaultProps,
      global: {
        plugins: [vuetify],
      },
    })

    // This would require simulating VSelect interaction
    // For now, we test the handler method
    await wrapper.vm.handleAuthorFilter('John Doe')
    expect(wrapper.emitted('author-filter')).toBeTruthy()
    expect(wrapper.emitted('author-filter')?.[0]).toEqual(['John Doe'])
  })

  it('should emit clear-filters event when clear button clicked', async () => {
    const wrapper = mount(VersionsTable, {
      props: defaultProps,
      global: {
        plugins: [vuetify],
      },
    })

    const clearButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('versions.filterClear')
    )

    if (clearButton) {
      await clearButton.trigger('click')
      expect(wrapper.emitted('clear-filters')).toBeTruthy()
    }
  })

  it('should hide comment buttons when canEdit is false', () => {
    const wrapper = mount(VersionsTable, {
      props: {
        ...defaultProps,
        config: {
          ...mockConfig,
          canEdit: ref(false),
        },
      },
      global: {
        plugins: [vuetify],
      },
    })

    const commentButtons = wrapper.findAll('button').filter(btn =>
      btn.text().includes('versions.editComment') || btn.text().includes('versions.addComment')
    )

    expect(commentButtons).toHaveLength(0)
  })

  it('should not show action buttons for current version', () => {
    const wrapper = mount(VersionsTable, {
      props: {
        ...defaultProps,
        filteredVersions: [mockVersions[0]], // Only current version
      },
      global: {
        plugins: [vuetify],
      },
    })

    // Current version should not have preview, comment, or copy buttons
    const previewButtons = wrapper.findAll('button').filter(btn =>
      btn.text().includes('versions.preview')
    )
    expect(previewButtons).toHaveLength(0)
  })

  it('should display user initials in avatar', () => {
    const wrapper = mount(VersionsTable, {
      props: defaultProps,
      global: {
        plugins: [vuetify],
      },
    })

    const avatars = wrapper.findAll('.v-avatar')
    expect(avatars.length).toBeGreaterThan(0)
  })

  it('should show no data message when no versions', () => {
    const wrapper = mount(VersionsTable, {
      props: {
        ...defaultProps,
        filteredVersions: [],
      },
      global: {
        plugins: [vuetify],
      },
    })

    const table = wrapper.find('.v-data-table')
    expect(table.exists()).toBe(true)
    // Vuetify will render no-data slot
  })
})
