/**
 * Smoke test for RoleDeleteDialog.vue
 * T094: Verify component can be mounted
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'
import RoleDeleteDialog from '@/components/config/permissions/RoleDeleteDialog.vue'

const vuetify = createVuetify({ components, directives })
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('@/composables/useRoles', () => ({
  useRoles: () => ({
    deleteRole: vi.fn().mockResolvedValue(true),
  }),
}))
vi.mock('@/utils/logger')

describe('RoleDeleteDialog.vue', () => {
  it('should mount without errors', () => {
    const wrapper = mount(RoleDeleteDialog, {
      global: { plugins: [vuetify, createPinia()] },
      props: { modelValue: false, role: null, userCount: 0 },
    })
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })
})
