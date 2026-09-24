/* eslint-disable vue/require-default-prop */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const routerPush = vi.fn()
const routeParams = { id: '123' }
const rolesMock = {
  currentRole: ref<any>(null),
  isLoadingRoles: ref(false),
  rolesError: ref<string | null>(null),
  fetchRoleById: vi.fn(async (id: number) => {
    rolesMock.currentRole.value = {
      id,
      name: 'Administrator',
      description: 'Full access',
    }
  }),
}

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
  useRoute: () => ({ params: routeParams }),
}))

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/composables/useRoles', () => ({
  useRoles: () => rolesMock,
}))

const RoleDetailsStub = defineComponent({
  name: 'RoleDetails',
  props: {
    role: { type: Object, required: false },
  },
  template: '<div data-testid="role-details-stub" />',
})

const AtlasContainerStub = defineComponent({
  name: 'AtlasContainer',
  template: '<div data-testid="atlas-container"><slot /></div>',
})

const AtlasAlertStub = defineComponent({
  name: 'AtlasAlert',
  props: {
    severity: { type: String, required: false },
  },
  template: '<div data-testid="atlas-alert"><slot /></div>',
})

const AtlasProgressCircularStub = defineComponent({
  name: 'AtlasProgressCircular',
  template: '<div data-testid="atlas-progress" />',
})

const AtlasButtonStub = defineComponent({
  name: 'AtlasButton',
  emits: ['click'],
  template: '<button data-testid="atlas-button" @click="$emit(\'click\')"><slot /></button>',
})

const AtlasRowStub = defineComponent({
  name: 'AtlasRow',
  template: '<div class="atlas-row"><slot /></div>',
})

const AtlasColStub = defineComponent({
  name: 'AtlasCol',
  template: '<div class="atlas-col"><slot /></div>',
})

const AtlasTabsStub = defineComponent({
  name: 'AtlasTabs',
  props: {
    modelValue: { type: [String, Number, Boolean, Object, Array], required: false },
  },
  template: '<div class="atlas-tabs"><slot /></div>',
})

const AtlasTabStub = defineComponent({
  name: 'AtlasTab',
  template: '<button class="atlas-tab"><slot /></button>',
})

const VWindowStub = defineComponent({
  name: 'VWindow',
  template: '<div class="v-window"><slot /></div>',
})

const VWindowItemStub = defineComponent({
  name: 'VWindowItem',
  template: '<div class="v-window-item"><slot /></div>',
})

const RoleUsersTabStub = defineComponent({
  name: 'RoleUsersTab',
  props: {
    roleId: { type: Number, required: false },
  },
  template: '<div data-testid="role-users-tab-stub" />',
})

const RolePermissionsTabStub = defineComponent({
  name: 'RolePermissionsTab',
  props: {
    roleId: { type: Number, required: false },
  },
  template: '<div data-testid="role-permissions-tab-stub" />',
})

const RoleUtilitiesTabStub = defineComponent({
  name: 'RoleUtilitiesTab',
  props: {
    roleId: { type: Number, required: false },
    roleName: { type: String, required: false },
  },
  template: '<div data-testid="role-utilities-tab-stub" />',
})

const vuetify = createVuetify({ components, directives })

async function mountView() {
  const { default: RoleDetailsView } = await import('@/views/config/RoleDetailsView.vue')
  return {
    wrapper: mount(RoleDetailsView, {
      global: {
        plugins: [vuetify, createPinia()],
        stubs: {
            AtlasContainer: AtlasContainerStub,
            AtlasAlert: AtlasAlertStub,
            AtlasProgressCircular: AtlasProgressCircularStub,
            AtlasButton: AtlasButtonStub,
            AtlasRow: AtlasRowStub,
            AtlasCol: AtlasColStub,
            AtlasTabs: AtlasTabsStub,
            AtlasTab: AtlasTabStub,
            VWindow: VWindowStub,
            VWindowItem: VWindowItemStub,
          RoleDetails: RoleDetailsStub,
          RoleUsersTab: RoleUsersTabStub,
          RolePermissionsTab: RolePermissionsTabStub,
          RoleUtilitiesTab: RoleUtilitiesTabStub,
        },
      },
    }),
  }
}

describe('RoleDetailsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    routerPush.mockReset()
    rolesMock.currentRole.value = null
    rolesMock.isLoadingRoles.value = false
    rolesMock.rolesError.value = null
    rolesMock.fetchRoleById.mockClear()
    rolesMock.fetchRoleById.mockImplementation(async (id: number) => {
      rolesMock.currentRole.value = {
        id,
        name: 'Administrator',
        description: 'Full access',
      }
    })
  })

  it('renders the loading and error states', async () => {
    rolesMock.isLoadingRoles.value = true
    const loading = await mountView()
    await flushPromises()
    expect(loading.wrapper.findComponent({ name: 'AtlasProgressCircular' }).exists()).toBe(true)
    loading.wrapper.unmount()

    rolesMock.isLoadingRoles.value = false
    rolesMock.rolesError.value = 'Broken roles'
    const error = await mountView()
    await flushPromises()
    expect(error.wrapper.findComponent({ name: 'AtlasAlert' }).exists()).toBe(true)
    error.wrapper.unmount()
  })

  it('shows the not-found state when no role exists', async () => {
    const mounted = await mountView()
    rolesMock.currentRole.value = null
    rolesMock.rolesError.value = null
    rolesMock.isLoadingRoles.value = false
    await flushPromises()

    expect(mounted.wrapper.findComponent({ name: 'AtlasAlert' }).exists()).toBe(true)
    mounted.wrapper.unmount()
  })

  it('loads the role, renders tabs, and navigates back', async () => {
    const mounted = await mountView()
    await flushPromises()

    expect(rolesMock.fetchRoleById).toHaveBeenCalledWith(123)
    expect(mounted.wrapper.findComponent({ name: 'RoleDetails' }).props('role')).toMatchObject({
      name: 'Administrator',
      description: 'Full access',
    })
    expect(mounted.wrapper.find('[data-testid="role-details-stub"]').exists()).toBe(true)
    expect(mounted.wrapper.find('[data-testid="role-users-tab-stub"]').exists()).toBe(true)
    expect(mounted.wrapper.find('[data-testid="role-permissions-tab-stub"]').exists()).toBe(true)
    expect(mounted.wrapper.find('[data-testid="role-utilities-tab-stub"]').exists()).toBe(true)

    await mounted.wrapper.get('button').trigger('click')
    expect(routerPush).toHaveBeenCalledWith({ name: 'role-management' })
    mounted.wrapper.unmount()
  })

  it('switches the active tab when the tabs and window emit updates', async () => {
    const mounted = await mountView()
    await flushPromises()

    const tabs = mounted.wrapper.findComponent({ name: 'AtlasTabs' })
    const window = mounted.wrapper.findComponent({ name: 'VWindow' })

    await tabs.vm.$emit('update:modelValue', 'permissions')
    expect((mounted.wrapper.vm as { activeTab: string }).activeTab).toBe('permissions')

    await window.vm.$emit('update:modelValue', 'utilities')
    expect((mounted.wrapper.vm as { activeTab: string }).activeTab).toBe('utilities')
  })

  it('skips loading when the route id is not numeric', async () => {
    routeParams.id = 'abc'
    const mounted = await mountView()
    await flushPromises()

    expect(rolesMock.fetchRoleById).not.toHaveBeenCalled()
    mounted.wrapper.unmount()
    routeParams.id = '123'
  })

  it('renders the role without a description', async () => {
    routeParams.id = 'abc'
    rolesMock.currentRole.value = {
      id: 123,
      name: 'Administrator',
    }

    const mounted = await mountView()
    await flushPromises()

    expect(mounted.wrapper.text()).toContain('Administrator')
    expect(mounted.wrapper.find('.role-details-view__title-section .text-body-1').exists()).toBe(false)
    mounted.wrapper.unmount()
    routeParams.id = '123'
  })
})