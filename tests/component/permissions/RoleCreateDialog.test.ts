/**
 * Smoke test for RoleCreateDialog.vue
 * T093: Verify component can be mounted
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'
import RoleCreateDialog from '@/components/config/permissions/RoleCreateDialog.vue'
import { ref } from 'vue'

const vuetify = createVuetify({ components, directives })
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('@/composables/useRoles', () => ({
  useRoles: () => ({
    roles: ref([]),
    createRole: vi.fn().mockResolvedValue({ id: 1, name: 'Test' }),
    updateRole: vi.fn().mockResolvedValue(true),
  }),
}))
vi.mock('@/utils/logger')

describe('RoleCreateDialog.vue', () => {
  it('should mount without errors', () => {
    const wrapper = mount(RoleCreateDialog, {
      global: { plugins: [vuetify, createPinia()] },
      props: { modelValue: false, role: null },
    })
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })
})
