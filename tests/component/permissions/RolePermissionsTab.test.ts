/**
 * Smoke test for RolePermissionsTab.vue
 * T095: Verify component can be mounted
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'
import RolePermissionsTab from '@/components/config/permissions/RolePermissionsTab.vue'
import { ref } from 'vue'

const vuetify = createVuetify({ components, directives })
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('@/composables/useRoles', () => ({
  useRoles: () => ({
    permissions: ref([]),
    rolePermissions: ref([]),
    isLoadingPermissions: ref(false),
    permissionsError: ref(null),
    fetchPermissions: vi.fn().mockResolvedValue(true),
    fetchRolePermissions: vi.fn().mockResolvedValue(true),
    assignPermissionToRole: vi.fn().mockResolvedValue(true),
    removePermissionFromRole: vi.fn().mockResolvedValue(true),
  }),
}))
vi.mock('@/utils/logger')

describe('RolePermissionsTab.vue', () => {
  it('should mount without errors', () => {
    const wrapper = mount(RolePermissionsTab, {
      global: { plugins: [vuetify, createPinia()] },
      props: { roleId: 1 },
    })
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })
})
