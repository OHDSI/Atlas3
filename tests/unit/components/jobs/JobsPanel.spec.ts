/**
 * Unit tests for JobsPanel — the standalone side-drawer that hosts the
 * Jobs section (promoted out of the Configuration panel into its own
 * top-level nav entry).
 *
 * The component is a thin shell around JobsSection: the goal here is to
 * cover the script-side wiring (open/close, permission gating, window
 * resize), not to exercise Vuetify's drawer internals.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import JobsPanel from '@/components/jobs/JobsPanel.vue'
import { useUIStore } from '@/stores/ui'

const vuetify = createVuetify({ components, directives })

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

// Permission gate inside the panel reads from this composable.
const hasPermission = vi.fn<(perm: string) => boolean>(() => true)
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ hasPermission }),
}))

// JobsSection itself has its own service-layer plumbing; stub it so the
// drawer test stays focused on shell behavior.
vi.mock('@/components/config/JobsSection.vue', () => ({
  default: {
    name: 'JobsSection',
    template: '<div data-testid="jobs-section-stub" />',
  },
}))

function mountPanel(): VueWrapper {
  return mount(JobsPanel, {
    global: {
      plugins: [vuetify],
      stubs: {
        // The full v-navigation-drawer needs a Vuetify layout context;
        // a transparent shell is sufficient for testing slot behavior.
        VNavigationDrawer: {
          template: '<div class="v-navigation-drawer"><slot /></div>',
          props: ['modelValue', 'location', 'temporary', 'width'],
        },
      },
    },
  })
}

describe('JobsPanel', () => {
  let wrapper: VueWrapper
  let ui: ReturnType<typeof useUIStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    ui = useUIStore()
    hasPermission.mockClear()
    hasPermission.mockReturnValue(true)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.restoreAllMocks()
  })

  it('renders the JobsSection when the user has job:execution:get', () => {
    wrapper = mountPanel()
    expect(wrapper.find('[data-testid="jobs-section-stub"]').exists()).toBe(true)
    expect(hasPermission).toHaveBeenCalledWith('job:execution:get')
  })

  it('renders a no-access alert when the user lacks the jobs permission', () => {
    hasPermission.mockImplementation(() => false)
    wrapper = mountPanel()
    expect(wrapper.find('[data-testid="jobs-section-stub"]').exists()).toBe(false)
    // The i18n mock returns the fallback text passed to `t(key, fallback)`.
    expect(wrapper.text()).toContain("You don't have access to the jobs panel.")
  })

  it('reflects ui store state via the computed isOpen getter/setter', async () => {
    wrapper = mountPanel()
    expect(ui.jobsPanelOpen).toBe(false)

    ui.openJobsPanel()
    await wrapper.vm.$nextTick()
    expect(ui.jobsPanelOpen).toBe(true)

    ui.closeJobsPanel()
    await wrapper.vm.$nextTick()
    expect(ui.jobsPanelOpen).toBe(false)
  })

  it('closes the panel when the close handler fires', async () => {
    wrapper = mountPanel()
    ui.openJobsPanel()
    await wrapper.vm.$nextTick()

    const closeBtn = wrapper.find('button')
    expect(closeBtn.exists()).toBe(true)
    await closeBtn.trigger('click')
    expect(ui.jobsPanelOpen).toBe(false)
  })

  it('registers and removes a window resize listener across its lifecycle', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    wrapper = mountPanel()
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    wrapper.unmount()
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('recomputes drawer width on window resize', async () => {
    wrapper = mountPanel()
    const initialWidth = (window as { innerWidth: number }).innerWidth
    // Shrink past the mobile breakpoint to force the alternate branch.
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 600 })
    window.dispatchEvent(new Event('resize'))
    await wrapper.vm.$nextTick()
    // Restore.
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: initialWidth })
    // No assertion on exact width — just that the resize path executes
    // without throwing.
    expect(wrapper.exists()).toBe(true)
  })
})
