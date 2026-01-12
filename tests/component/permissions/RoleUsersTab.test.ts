/**
 * Smoke test for RoleUsersTab.vue
 * T096: Verify component can be mounted
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'
import RoleUsersTab from '@/components/config/permissions/RoleUsersTab.vue'
import { ref } from 'vue'

const vuetify = createVuetify({ components, directives })
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('@/composables/useRoles', () => ({
  useRoles: () => ({
    users: ref([]),
    roleUsers: ref([]),
    isLoadingUsers: ref(false),
    usersError: ref(null),
    fetchUsers: vi.fn().mockResolvedValue(true),
    fetchRoleUsers: vi.fn().mockResolvedValue(true),
    assignUserToRole: vi.fn().mockResolvedValue(true),
    removeUserFromRole: vi.fn().mockResolvedValue(true),
  }),
}))
vi.mock('@/utils/logger')

describe('RoleUsersTab.vue', () => {
  it('should mount without errors', () => {
    const wrapper = mount(RoleUsersTab, {
      global: { plugins: [vuetify, createPinia()] },
      props: { roleId: 1 },
    })
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })
})
