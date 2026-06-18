/**
 * Component Tests: TagManagementSection
 *
 * Tests for tag management section component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import TagManagementSection from '@/components/config/TagManagementSection.vue'
import { useConfigStore } from '@/stores/config'
import type { Tag, TagGroup } from '@/models/config.types'

const vuetify = createVuetify({ components, directives })

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const mockTagGroup: TagGroup = {
  id: 1,
  name: 'Category',
  color: '#1976D2',
  icon: 'mdi-tag',
  mandatory: false,
  showGroup: true,
  multiSelection: false,
  allowCustom: false,
  description: 'Test category',
  groups: []
}

const mockTag: Tag = {
  id: 1,
  name: 'Test Tag',
  color: '#FF5722',
  icon: 'mdi-star',
  permissionProtected: false,
  description: 'Test description',
  groups: [mockTagGroup]
}

describe('TagManagementSection.vue', () => {
  let wrapper: VueWrapper
  let configStore: ReturnType<typeof useConfigStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    configStore = useConfigStore()

    // Mock store methods
    configStore.fetchTagGroups = vi.fn().mockResolvedValue(undefined)
    configStore.createTagGroup = vi.fn().mockResolvedValue(undefined)
    configStore.updateTagGroup = vi.fn().mockResolvedValue(undefined)
    configStore.deleteTagGroup = vi.fn().mockResolvedValue(undefined)
    configStore.createTag = vi.fn().mockResolvedValue(undefined)
    configStore.updateTag = vi.fn().mockResolvedValue(undefined)
    configStore.deleteTag = vi.fn().mockResolvedValue(undefined)
    configStore.getTagsForGroup = vi.fn().mockReturnValue([mockTag])

    // Set initial store state
    configStore.tagGroups = [mockTagGroup]
    configStore.isLoadingTagGroups = false
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Mounting and initialization', () => {
    it('should mount successfully', () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should load tag groups on mount', async () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      expect(configStore.fetchTagGroups).toHaveBeenCalled()
    })

    it('should display section title', () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.text()).toContain('Tag Management')
    })
  })

  describe('Create tag group button', () => {
    it('should display create tag group button', () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const createButton = buttons.find(btn => btn.text().includes('Create Tag Group'))
      expect(createButton).toBeDefined()
    })

    it('should open create dialog when button clicked', async () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const createButton = buttons.find(btn => btn.text().includes('Create Tag Group'))

      await createButton!.trigger('click')
      await wrapper.vm.$nextTick()

      // Dialog should be visible
      const dialogs = wrapper.findAllComponents({ name: 'VDialog' })
      expect(dialogs.length).toBeGreaterThan(0)
    })
  })

  describe('Tag group table', () => {
    it('should render tag group table', () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'TagGroupTable' })
      expect(table.exists()).toBe(true)
    })

    it('should pass tag groups to table', () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'TagGroupTable' })
      expect(table.props('items')).toEqual([mockTagGroup])
    })

    it('should pass loading state to table', () => {
      configStore.isLoadingTagGroups = true

      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'TagGroupTable' })
      expect(table.props('loading')).toBe(true)
    })
  })

  describe('Tag group CRUD operations', () => {
    it('should create tag group', async () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const createButton = buttons.find(btn => btn.text().includes('Create Tag Group'))
      await createButton!.trigger('click')
      await wrapper.vm.$nextTick()

      // Simulate save with a new group (no id)
      const dialog = wrapper.findComponent({ name: 'TagGroupDialog' })
      const newGroup = { ...mockTagGroup }
      delete (newGroup as { id?: number }).id
      await dialog.vm.$emit('save', newGroup)
      await flushPromises()

      expect(configStore.createTagGroup).toHaveBeenCalled()
    })

    it('should update tag group', async () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'TagGroupTable' })
      await table.vm.$emit('edit', mockTagGroup)
      await wrapper.vm.$nextTick()

      const dialog = wrapper.findComponent({ name: 'TagGroupDialog' })
      await dialog.vm.$emit('save', { ...mockTagGroup, id: 1 })
      await flushPromises()

      expect(configStore.updateTagGroup).toHaveBeenCalled()
    })

    it('should delete tag group', async () => {
      // Mock getTagsForGroup to return empty array (no tags in group)
      configStore.getTagsForGroup = vi.fn().mockReturnValue([])

      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'TagGroupTable' })
      await table.vm.$emit('delete', mockTagGroup)
      await wrapper.vm.$nextTick()

      // Find delete confirmation dialog by checking for cancel and delete buttons
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const deleteButton = buttons.find(btn => btn.text() === 'Delete' && btn.props('color') === 'error')
      expect(deleteButton).toBeDefined()
    })

    it('should prevent deleting tag group with tags', async () => {
      configStore.getTagsForGroup = vi.fn().mockReturnValue([mockTag])

      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'TagGroupTable' })
      await table.vm.$emit('delete', mockTagGroup)
      await wrapper.vm.$nextTick()

      // Confirm delete
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const deleteButton = buttons.find(btn => btn.text() === 'Delete' && btn.props('color') === 'error')
      await deleteButton!.trigger('click')
      await flushPromises()

      // Should not have called deleteTagGroup
      expect(configStore.deleteTagGroup).not.toHaveBeenCalled()
    })
  })

  describe('Tag display and management', () => {
    it('should show tags when show tags clicked', async () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'TagGroupTable' })
      await table.vm.$emit('showTags', mockTagGroup)
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain(`Tags in "${mockTagGroup.name}"`)
    })

    it('should display tag table when group selected', async () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'TagGroupTable' })
      await table.vm.$emit('showTags', mockTagGroup)
      await wrapper.vm.$nextTick()

      const tagTable = wrapper.findComponent({ name: 'TagTable' })
      expect(tagTable.exists()).toBe(true)
    })

    it('should display back button when viewing tags', async () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'TagGroupTable' })
      await table.vm.$emit('showTags', mockTagGroup)
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const backButton = buttons.find(btn => btn.text().includes('Back to Tag Groups'))
      expect(backButton).toBeDefined()
    })

    it('should return to tag groups when back clicked', async () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'TagGroupTable' })
      await table.vm.$emit('showTags', mockTagGroup)
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const backButton = buttons.find(btn => btn.text().includes('Back to Tag Groups'))
      await backButton!.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent({ name: 'TagTable' }).exists()).toBe(false)
    })
  })

  describe('Tag CRUD operations', () => {
    beforeEach(async () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      // Navigate to tags view
      const table = wrapper.findComponent({ name: 'TagGroupTable' })
      await table.vm.$emit('showTags', mockTagGroup)
      await wrapper.vm.$nextTick()
    })

    it('should display create tag button when viewing tags', () => {
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const createButton = buttons.find(btn => btn.text() === 'Create Tag')
      expect(createButton).toBeDefined()
    })

    it('should create tag', async () => {
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const createButton = buttons.find(btn => btn.text() === 'Create Tag')
      await createButton!.trigger('click')
      await wrapper.vm.$nextTick()

      const dialog = wrapper.findComponent({ name: 'TagDialog' })
      const newTag = { ...mockTag }
      delete (newTag as { id?: number }).id
      await dialog.vm.$emit('save', newTag)
      await flushPromises()

      expect(configStore.createTag).toHaveBeenCalled()
    })

    it('should update tag', async () => {
      const tagTable = wrapper.findComponent({ name: 'TagTable' })
      await tagTable.vm.$emit('edit', mockTag)
      await wrapper.vm.$nextTick()

      const dialog = wrapper.findComponent({ name: 'TagDialog' })
      await dialog.vm.$emit('save', { ...mockTag, id: 1 })
      await flushPromises()

      expect(configStore.updateTag).toHaveBeenCalled()
    })

    it('should delete tag', async () => {
      const tagTable = wrapper.findComponent({ name: 'TagTable' })
      await tagTable.vm.$emit('delete', mockTag)
      await wrapper.vm.$nextTick()

      // Check that delete confirmation is shown
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const deleteButton = buttons.find(btn => btn.text() === 'Delete' && btn.props('color') === 'error')
      expect(deleteButton).toBeDefined()
    })
  })

  describe('Toast notifications', () => {
    it('should show success toast on successful create', async () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const createButton = buttons.find(btn => btn.text().includes('Create Tag Group'))
      await createButton!.trigger('click')
      await wrapper.vm.$nextTick()

      const dialog = wrapper.findComponent({ name: 'TagGroupDialog' })
      await dialog.vm.$emit('save', mockTagGroup)
      await flushPromises()

      const snackbars = wrapper.findAllComponents({ name: 'AtlasSnackbar' })
      const successSnackbar = snackbars.find(s => s.props('severity') === 'success')
      expect(successSnackbar?.props('modelValue')).toBe(true)
    })

    it('should show error toast on failure', async () => {
      configStore.fetchTagGroups = vi.fn().mockRejectedValue(new Error('Network error'))

      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const snackbars = wrapper.findAllComponents({ name: 'AtlasSnackbar' })
      const errorSnackbar = snackbars.find(s => s.props('severity') === 'danger')
      expect(errorSnackbar?.props('modelValue')).toBe(true)
    })
  })

  describe('Dialog visibility', () => {
    it('should show TagGroupDialog when creating/editing group', async () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const createButton = buttons.find(btn => btn.text().includes('Create Tag Group'))
      await createButton!.trigger('click')
      await wrapper.vm.$nextTick()

      const dialog = wrapper.findComponent({ name: 'TagGroupDialog' })
      expect(dialog.exists()).toBe(true)
      expect(dialog.props('modelValue')).toBe(true)
    })

    it('should show TagDialog only when group is selected', async () => {
      wrapper = mount(TagManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      // Initially no TagDialog
      expect(wrapper.findComponent({ name: 'TagDialog' }).exists()).toBe(false)

      // Select a group
      const table = wrapper.findComponent({ name: 'TagGroupTable' })
      await table.vm.$emit('showTags', mockTagGroup)
      await wrapper.vm.$nextTick()

      // Now TagDialog component should exist (but not visible)
      const tagDialog = wrapper.findComponent({ name: 'TagDialog' })
      expect(tagDialog.exists()).toBe(true)
    })
  })
})
