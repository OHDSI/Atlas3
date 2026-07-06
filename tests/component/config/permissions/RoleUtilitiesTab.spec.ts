/**
 * RoleUtilitiesTab tests
 *
 * Covers the export/import card template, the export success + error handlers,
 * and the import-success callback wired to the RoleImportDialog child.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const exportRole = vi.fn()

vi.mock('@/composables/useRoles', () => ({
  useRoles: () => ({
    exportRole,
  }),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import RoleUtilitiesTab from '@/components/config/permissions/RoleUtilitiesTab.vue'

const vuetify = createVuetify({ components, directives })

function makeStubs() {
  return {
    AtlasIcon: { template: '<span class="stub-icon"><slot /></span>' },
    AtlasDivider: { template: '<hr class="stub-divider" />' },
    AtlasAlert: {
      props: ['severity'],
      emits: ['close'],
      template:
        '<div class="stub-alert" :data-severity="severity"><slot /><button class="stub-alert-close" @click="$emit(\'close\')" /></div>',
    },
    AtlasButton: {
      props: ['icon', 'loading'],
      emits: ['click'],
      template: '<button class="stub-btn" @click="$emit(\'click\', $event)"><slot /></button>',
    },
    RoleImportDialog: {
      props: ['modelValue'],
      emits: ['update:modelValue', 'success'],
      template:
        '<div class="stub-import-dialog"><button class="stub-import-success" @click="$emit(\'success\', \'Imported Role\')" /></div>',
    },
  }
}

function mountIt() {
  setActivePinia(createPinia())
  return mount(RoleUtilitiesTab, {
    props: { roleId: 42, roleName: 'Admins' },
    global: {
      plugins: [vuetify],
      stubs: makeStubs(),
    },
  })
}

function findBtnByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('.stub-btn').find(w => w.text().includes(text))
}

describe('RoleUtilitiesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    exportRole.mockReset()
    global.URL.createObjectURL = vi.fn(() => 'blob:mock')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('renders the intro, export and import sections', () => {
    const wrapper = mountIt()
    expect(wrapper.text()).toMatch(/Import and export role configurations/)
    expect(wrapper.text()).toMatch(/Export Role/)
    expect(wrapper.text()).toMatch(/Import Role/)
    expect(wrapper.find('.stub-import-dialog').exists()).toBe(true)
  })

  it('export success path downloads the file and shows a success message', async () => {
    exportRole.mockResolvedValueOnce('{"role":"data"}')
    const wrapper = mountIt()

    await findBtnByText(wrapper, 'Export Role as JSON')!.trigger('click')
    await flushPromises()

    expect(exportRole).toHaveBeenCalledWith(42)
    expect(global.URL.createObjectURL).toHaveBeenCalled()
    expect(wrapper.find('.stub-alert[data-severity="success"]').exists()).toBe(true)
    expect(wrapper.text()).toMatch(/exported successfully/)
    expect(wrapper.text()).toMatch(/Admins/)
  })

  it('export shows an error when the service resolves empty (throws internally)', async () => {
    exportRole.mockResolvedValueOnce(null)
    const wrapper = mountIt()

    await findBtnByText(wrapper, 'Export Role as JSON')!.trigger('click')
    await flushPromises()

    expect(wrapper.find('.stub-alert[data-severity="danger"]').exists()).toBe(true)
    expect(wrapper.text()).toMatch(/Failed to export role/)
  })

  it('export catch branch surfaces a thrown Error message', async () => {
    exportRole.mockRejectedValueOnce(new Error('network boom'))
    const wrapper = mountIt()

    await findBtnByText(wrapper, 'Export Role as JSON')!.trigger('click')
    await flushPromises()

    expect(wrapper.find('.stub-alert[data-severity="danger"]').exists()).toBe(true)
    expect(wrapper.text()).toMatch(/network boom/)
  })

  it('export catch branch uses the fallback message for a non-Error throw', async () => {
    exportRole.mockRejectedValueOnce('plain string failure')
    const wrapper = mountIt()

    await findBtnByText(wrapper, 'Export Role as JSON')!.trigger('click')
    await flushPromises()

    expect(wrapper.find('.stub-alert[data-severity="danger"]').exists()).toBe(true)
    expect(wrapper.text()).toMatch(/Failed to export role/)
  })

  it('import success handler shows a success message with the role name', async () => {
    const wrapper = mountIt()

    await wrapper.find('.stub-import-success').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.stub-alert[data-severity="success"]').exists()).toBe(true)
    expect(wrapper.text()).toMatch(/imported successfully/)
    expect(wrapper.text()).toMatch(/Imported Role/)
  })
})
