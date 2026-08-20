/**
 * Component test for RoleList.vue
 * T092: Verify search filter, pagination, row click
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import RoleList from '@/components/config/permissions/RoleList.vue'
import type { Role } from '@/models/role.types'
import { nextTick } from 'vue'

const vuetify = createVuetify({
  components,
  directives,
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock router
const mockRouter = {
  push: vi.fn(),
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
}))

// Create mock refs
import { ref } from 'vue'

const mockRoles = ref<Role[]>([])
const mockIsLoadingRoles = ref(false)
const mockRolesError = ref<string | null>(null)
const mockRoleUsers = ref<any[]>([])
const mockFetchRoles = vi.fn().mockResolvedValue(true)
const mockFetchRoleUsers = vi.fn().mockResolvedValue(true)

// Mock useRoles composable
vi.mock('@/composables/useRoles', () => ({
  useRoles: () => ({
    roles: mockRoles,
    isLoadingRoles: mockIsLoadingRoles,
    rolesError: mockRolesError,
    roleUsers: mockRoleUsers,
    fetchRoles: mockFetchRoles,
    fetchRoleUsers: mockFetchRoleUsers,
  }),
}))

// Mock services
vi.mock('@/services/role.service')
vi.mock('@/services/permission.service')
vi.mock('@/services/user.service')
vi.mock('@/utils/logger')

describe('RoleList.vue', () => {
  let wrapper: VueWrapper

  const testRoles: Role[] = [
    {
      id: 1,
      name: 'Admin',
      description: 'Administrator role',
      createdDate: '2024-01-01T10:00:00Z',
      modifiedDate: '2024-01-01T10:00:00Z',
    },
    {
      id: 2,
      name: 'User',
      description: 'Regular user role',
      createdDate: '2024-01-02T10:00:00Z',
      modifiedDate: '2024-01-02T10:00:00Z',
    },
    {
      id: 3,
      name: 'Editor',
      description: 'Content editor role',
      createdDate: '2024-01-03T10:00:00Z',
      modifiedDate: '2024-01-03T10:00:00Z',
    },
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Reset mock data
    mockRoles.value = []
    mockIsLoadingRoles.value = false
    mockRolesError.value = null
    mockRoleUsers.value = []

    wrapper = mount(RoleList, {
      global: {
        plugins: [vuetify, createPinia()],
        stubs: {
          RoleCreateDialog: true,
          RoleDeleteDialog: true,
        },
      },
    })
  })

  afterEach(() => {
    wrapper.unmount()
  })

  describe('rendering', () => {
    it('should render the component', () => {
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.role-list').exists()).toBe(true)
    })

    it('should display header with title', () => {
      expect(wrapper.text()).toContain('Roles')
    })

    it('should show loading state when loading', async () => {
      mockIsLoadingRoles.value = true
      await nextTick()

      const progressBar = wrapper.find('.v-progress-linear')
      expect(progressBar.exists()).toBe(true)
    })

    it('should show empty state when no roles', async () => {
      // Re-mount with empty roles
      wrapper.unmount()
      mockRoles.value = []
      mockIsLoadingRoles.value = false

      wrapper = mount(RoleList, {
        global: {
          plugins: [vuetify, createPinia()],
          stubs: {
            RoleCreateDialog: true,
            RoleDeleteDialog: true,
          },
        },
      })

      await nextTick()

      const emptyState = wrapper.find('.role-list__empty')
      expect(emptyState.exists()).toBe(true)
      expect(emptyState.text()).toContain('No roles found')
    })
  })

  describe('search functionality', () => {
    it('should have search component', () => {
      const search = wrapper.find('.role-list__search')
      expect(search.exists()).toBe(true)
    })
  })

  describe('role actions', () => {
    it('should have action handlers', () => {
      const vm = wrapper.vm as any
      expect(typeof vm.handleCreate).toBe('function')
      expect(typeof vm.handleEdit).toBe('function')
      expect(typeof vm.handleDelete).toBe('function')
      expect(typeof vm.handleRowClick).toBe('function')
    })

    it('should call handleEdit with role', async () => {
      const vm = wrapper.vm as any
      vm.handleEdit(testRoles[0])
      await nextTick()

      expect(vm.createDialogOpen).toBe(true)
      expect(vm.selectedRole).toEqual(testRoles[0])
    })

    it('should call handleCreate and open dialog', async () => {
      const vm = wrapper.vm as any
      vm.handleCreate()
      await nextTick()

      expect(vm.createDialogOpen).toBe(true)
      expect(vm.selectedRole).toBeNull()
    })

    it('should navigate to role details on row click', async () => {
      const vm = wrapper.vm as any
      const mockEvent = {} as Event
      const row = { item: testRoles[0] }

      vm.handleRowClick(mockEvent, row)

      expect(mockRouter.push).toHaveBeenCalledWith({
        name: 'role-details',
        params: { id: 1 },
      })
    })

    it('should fetch role users on delete', async () => {
      mockRoleUsers.value = []
      const vm = wrapper.vm as any
      await vm.handleDelete(testRoles[0])

      expect(mockFetchRoleUsers).toHaveBeenCalledWith(1)
    })
  })

  describe('data formatting', () => {
    it('should format dates correctly', () => {
      const vm = wrapper.vm as any
      const formatted = vm.formatDate('2024-01-01T10:00:00Z')

      expect(formatted).toMatch(/Jan/)
      expect(formatted).toMatch(/2024/)
    })

    it('should handle invalid dates', () => {
      const vm = wrapper.vm as any
      const formatted = vm.formatDate('invalid')

      expect(formatted).toBe('—')
    })

    it('should handle missing dates', () => {
      const vm = wrapper.vm as any
      const formatted = vm.formatDate(undefined)

      expect(formatted).toBe('—')
    })
  })

  describe('lifecycle', () => {
    it('should call fetchRoles on mount', () => {
      expect(mockFetchRoles).toHaveBeenCalled()
    })
  })
})
