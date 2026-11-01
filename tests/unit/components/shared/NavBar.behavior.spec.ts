import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, DOMWrapper, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { computed } from 'vue'
import NavBar from '@/components/shared/NavBar.vue'
import { generatePluginMenuItems } from '@/plugins/navigation/PluginMenuIntegration.ts'
import { usePluginMounts } from '@/composables/usePluginMounts'
import { logger } from '@/utils/logger'
import { tr } from '../../../helpers/i18n-mock'

const h = vi.hoisted(() => ({
  currentPath: { value: '/cohorts' },
  afterEachCallbacks: [] as (() => void)[],
  push: vi.fn(),
  isAuthenticated: { value: false },
  isRunningAs: { value: false },
  logout: vi.fn(),
  endRunAs: vi.fn(),
  openLoginModal: vi.fn(),
  hasPermission: vi.fn((_p: string) => true),
  hasAnyPermission: vi.fn((_p: string[]) => true),
  ui: {
    configPanelState: { isOpen: false },
    jobsPanelOpen: false,
    openConfigPanel: vi.fn(),
    closeConfigPanel: vi.fn(),
    openJobsPanel: vi.fn(),
    closeJobsPanel: vi.fn(),
  },
  authConfig: { userAuthenticationEnabled: true, enableSkipLogin: false },
  plugins: [] as { registration: { id: string } }[],
  stateCallbacks: [] as { id: string; cb: (state: string) => void }[],
  config: {
    logoUrl: null as string | null,
    feedback: true,
    disabledCore: [] as string[],
  },
  configChange: [] as (() => void)[],
}))

vi.mock('vue-router', async () => {
  const { ref: vueRef } = await import('vue')
  const currentRoute = vueRef({ path: h.currentPath.value })
  return {
    useRouter: () => {
      currentRoute.value = { path: h.currentPath.value }
      return {
        push: h.push,
        isReady: () => Promise.resolve(true),
        currentRoute,
        afterEach: (cb: () => void) => {
          h.afterEachCallbacks.push(() => {
            currentRoute.value = { path: h.currentPath.value }
            cb()
          })
        },
      }
    },
  }
})

vi.mock('@/composables/useAuth', async () => {
  const { ref: vueRef, computed: vueComputed } = await import('vue')
  const authed = vueRef(false)
  const runningAs = vueRef(false)
  return {
    useAuth: () => {
      authed.value = h.isAuthenticated.value
      runningAs.value = h.isRunningAs.value
      return {
        isAuthenticated: vueComputed(() => authed.value),
        userDisplayName: vueRef('Test User'),
        isRunningAs: vueComputed(() => runningAs.value),
        logout: h.logout,
        endRunAs: h.endRunAs,
        openLoginModal: h.openLoginModal,
      }
    },
  }
})

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: h.hasPermission,
    hasAnyPermission: h.hasAnyPermission,
  }),
}))

vi.mock('@/composables/usePluginMounts', () => ({
  usePluginMounts: vi.fn(() => ({ items: computed(() => []) })),
}))

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/stores/ui', () => ({ useUIStore: () => h.ui }))

vi.mock('@/stores/theme', () => ({ useThemeStore: () => ({ resolved: 'light' }) }))

vi.mock('@/config/auth.config', () => ({ getAuthConfig: () => h.authConfig }))

vi.mock('@/plugins/navigation/PluginMenuIntegration.ts', async importOriginal => ({
  ...(await importOriginal<object>()),
  generatePluginMenuItems: vi.fn(() => []),
}))

vi.mock('@/plugins/core/PluginRegistry', () => ({
  pluginRegistry: {
    getAllPlugins: vi.fn(() => h.plugins),
    onStateChange: vi.fn((id: string, cb: (state: string) => void) => {
      h.stateCallbacks.push({ id, cb })
    }),
  },
}))

vi.mock('@/services/PluginConfigService', () => ({
  pluginConfigService: {
    getLogoUrl: () => h.config.logoUrl,
    isCoreNavigationItemEnabled: (id: string) => !h.config.disabledCore.includes(id),
    onChange: (cb: () => void) => h.configChange.push(cb),
    showFeedbackButton: () => h.config.feedback,
    showLanguageSelector: () => true,
    showConfigButton: () => true,
    showUserMenu: () => true,
    showThemeToggle: () => true,
    getFeedbackUrl: () => 'https://feedback.example',
    getLogoNavigateTo: () => '/',
  },
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/components/auth/LoginModal.vue', () => ({
  default: { name: 'LoginModal', template: '<div />' },
}))
vi.mock('@/components/LanguageSelector.vue', () => ({
  default: { name: 'LanguageSelector', template: '<div />' },
}))

import { pluginRegistry } from '@/plugins/core/PluginRegistry'

const vuetify = createVuetify({ components, directives })

function mountNavSync() {
  return mount(NavBar, {
    attachTo: document.body,
    global: {
      plugins: [vuetify],
      stubs: {
        LoginModal: true,
        LanguageSelector: true,
        NotificationInbox: true,
        ThemeToggle: true,
        RunAsPanel: true,
      },
    },
  })
}

async function mountNav() {
  const w = mountNavSync()
  await flushPromises()
  return w
}

function navLinks(wrapper: VueWrapper) {
  return wrapper.findAll('.nav-bar__nav-list .nav-bar__nav-item')
}

function activeLabels(wrapper: VueWrapper) {
  return wrapper.findAll('.nav-bar__nav-list .nav-bar__nav-item--active').map(li => li.text())
}

async function openUserMenu(wrapper: VueWrapper) {
  await wrapper.find('.nav-bar__user button').trigger('click')
  await flushPromises()
  return new DOMWrapper(document.body)
}

function pluginItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1-tools',
    pluginId: 'p1',
    name: 'Tools',
    route: '/plugins/p1/tools',
    order: 1,
    visible: true,
    insertAfter: 'analysis',
    ...overrides,
  }
}

let wrapper: VueWrapper | undefined

beforeEach(() => {
  vi.clearAllMocks()
  h.currentPath.value = '/cohorts'
  h.afterEachCallbacks.length = 0
  h.isAuthenticated.value = false
  h.isRunningAs.value = false
  h.hasPermission.mockImplementation(() => true)
  h.hasAnyPermission.mockImplementation(() => true)
  h.ui.configPanelState.isOpen = false
  h.ui.jobsPanelOpen = false
  h.authConfig.userAuthenticationEnabled = true
  h.authConfig.enableSkipLogin = false
  h.plugins = []
  h.stateCallbacks.length = 0
  h.config.logoUrl = null
  h.config.feedback = true
  h.config.disabledCore = []
  h.configChange.length = 0
  vi.mocked(generatePluginMenuItems).mockReturnValue([])
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

describe('NavBar core navigation', () => {
  it('renders the four core sections in order with translated titles', async () => {
    wrapper = await mountNav()
    expect(navLinks(wrapper).map(l => l.text())).toEqual([
      tr('navigation.datasources'),
      tr('navigation.conceptsets'),
      tr('navigation.cohortdefinitions'),
      tr('navigation.analysis'),
    ])
  })

  it('navigates each link to its route', async () => {
    wrapper = await mountNav()
    for (const link of wrapper.findAll('.nav-bar__nav-list .nav-bar__nav-link')) {
      await link.trigger('click')
    }
    await flushPromises()
    expect(h.push.mock.calls.map(c => c[0])).toEqual(['/datasources', '/concepts', '/cohorts', '/analysis'])
  })

  it('hides core items disabled by configuration', async () => {
    h.config.disabledCore = ['analysis']
    wrapper = await mountNav()
    expect(navLinks(wrapper).map(l => l.text())).not.toContain(tr('navigation.analysis'))
    expect(navLinks(wrapper)).toHaveLength(3)
  })

  it('marks the item matching the current route as active', async () => {
    h.currentPath.value = '/datasources'
    wrapper = await mountNav()
    expect(activeLabels(wrapper)).toEqual([tr('navigation.datasources')])
  })

  it('moves the active marker to a clicked item', async () => {
    wrapper = await mountNav()
    await wrapper.findAll('.nav-bar__nav-list .nav-bar__nav-link')[1].trigger('click')
    await flushPromises()
    expect(activeLabels(wrapper)).toEqual([tr('navigation.conceptsets')])
  })

  it('updates the active item after each route change, including nested paths', async () => {
    wrapper = await mountNav()
    h.currentPath.value = '/concepts/123'
    h.afterEachCallbacks.forEach(cb => cb())
    await flushPromises()
    expect(activeLabels(wrapper)).toEqual([tr('navigation.conceptsets')])
  })
})

describe('NavBar plugin menu items', () => {
  it('omits plugin items that are not visible', async () => {
    vi.mocked(generatePluginMenuItems).mockReturnValue([pluginItem({ visible: false })])
    wrapper = await mountNav()
    expect(navLinks(wrapper).map(l => l.text())).not.toContain('Tools')
  })

  it('shows capitalized plugin names verbatim and translates lowercase keys', async () => {
    vi.mocked(generatePluginMenuItems).mockReturnValue([
      pluginItem(),
      pluginItem({ id: 'p2-x', name: 'navigation.feedback', route: '/plugins/p2' }),
    ])
    wrapper = await mountNav()
    const labels = navLinks(wrapper).map(l => l.text())
    expect(labels).toContain('Tools')
    expect(labels).toContain(tr('navigation.feedback'))
    expect(labels).not.toContain('navigation.feedback')
  })

  it('logs when plugin menu items cannot be built', async () => {
    vi.mocked(generatePluginMenuItems).mockImplementation(() => {
      throw new Error('bad manifest')
    })
    wrapper = await mountNav()
    expect(logger.error).toHaveBeenCalled()
    expect(navLinks(wrapper)).toHaveLength(4)
  })

  it('reloads menu items when a watched plugin finishes loading, not on other states', async () => {
    h.plugins = [{ registration: { id: 'p1' } }]
    wrapper = await mountNav()
    expect(h.stateCallbacks.map(s => s.id)).toEqual(['p1'])
    vi.mocked(generatePluginMenuItems).mockClear()

    h.stateCallbacks[0].cb('loading')
    expect(generatePluginMenuItems).not.toHaveBeenCalled()

    vi.mocked(generatePluginMenuItems).mockReturnValue([pluginItem()])
    h.stateCallbacks[0].cb('loaded')
    await flushPromises()
    expect(generatePluginMenuItems).toHaveBeenCalledTimes(1)
    expect(navLinks(wrapper).map(l => l.text())).toContain('Tools')
    expect(activeLabels(wrapper)).toEqual([tr('navigation.cohortdefinitions')])
  })
})

describe('NavBar plugin polling', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('polls for new plugins every 500ms for 5 seconds and watches each once', async () => {
    h.plugins = [{ registration: { id: 'p1' } }]
    wrapper = mountNavSync()
    expect(pluginRegistry.getAllPlugins).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(500)
    expect(pluginRegistry.getAllPlugins).toHaveBeenCalledTimes(2)

    h.plugins = [{ registration: { id: 'p1' } }, { registration: { id: 'p2' } }]
    vi.advanceTimersByTime(4500)
    expect(pluginRegistry.getAllPlugins).toHaveBeenCalledTimes(11)
    expect(h.stateCallbacks.map(s => s.id)).toEqual(['p1', 'p2'])

    vi.advanceTimersByTime(5000)
    expect(pluginRegistry.getAllPlugins).toHaveBeenCalledTimes(11)
  })
})

describe('NavBar admin and panels', () => {
  it('checks the core admin permissions and plugin admin tabs', async () => {
    wrapper = await mountNav()
    expect(h.hasAnyPermission).toHaveBeenCalledWith([
      'admin:cache',
      'admin:source',
      'admin:tags',
      'admin:security',
    ])
    const surfaces = vi.mocked(usePluginMounts).mock.calls.map(c => c[0])
    expect(surfaces).toEqual(['admin-tabs', 'account-menu'])
  })

  it('closes the config panel when it is open', async () => {
    h.ui.configPanelState.isOpen = true
    wrapper = await mountNav()
    await wrapper.find('[data-testid="nav-config"]').trigger('click')
    expect(h.ui.closeConfigPanel).toHaveBeenCalledTimes(1)
    expect(h.ui.openConfigPanel).not.toHaveBeenCalled()
  })

  it('opens the jobs panel when closed and closes it when open', async () => {
    wrapper = await mountNav()
    await wrapper.find('[data-testid="nav-jobs"]').trigger('click')
    expect(h.ui.openJobsPanel).toHaveBeenCalledTimes(1)
    expect(h.ui.closeJobsPanel).not.toHaveBeenCalled()

    h.ui.jobsPanelOpen = true
    await wrapper.find('[data-testid="nav-jobs"]').trigger('click')
    expect(h.ui.closeJobsPanel).toHaveBeenCalledTimes(1)
    expect(h.ui.openJobsPanel).toHaveBeenCalledTimes(1)
  })

  it('opens the docs', async () => {
    wrapper = await mountNav()
    await wrapper.find('[data-testid="nav-docs"]').trigger('click')
    await flushPromises()
    expect(h.push).toHaveBeenCalledWith('/docs')
  })

  it('applies configuration changes published after mount', async () => {
    wrapper = await mountNav()
    const feedback = () => wrapper!.findAll('.v-btn').filter(b => b.text().includes(tr('navigation.feedback')))
    expect(feedback()).toHaveLength(1)
    h.config.feedback = false
    h.configChange.forEach(cb => cb())
    await flushPromises()
    expect(feedback()).toHaveLength(0)
  })
})

describe('NavBar custom logo', () => {
  it('logs when the custom logo fails and records a successful load', async () => {
    h.config.logoUrl = 'https://logo.example/logo.png'
    wrapper = await mountNav()
    await flushPromises()
    const img = wrapper.find('.nav-bar__custom-logo')
    expect(img.attributes('src')).toBe('https://logo.example/logo.png')
    await img.trigger('error')
    expect(logger.error).toHaveBeenCalledWith(
      'NavBar',
      expect.any(String),
      expect.objectContaining({ url: 'https://logo.example/logo.png' })
    )
    await img.trigger('load')
    expect(logger.debug).toHaveBeenCalledWith('NavBar', expect.any(String), 'https://logo.example/logo.png')
  })
})

describe('NavBar login prompt on mount', () => {
  it('opens the login modal when skip-login is enabled and the user is anonymous', async () => {
    h.authConfig.enableSkipLogin = true
    wrapper = await mountNav()
    expect(h.openLoginModal).toHaveBeenCalledTimes(1)
  })

  it('does not open it when skip-login is disabled', async () => {
    wrapper = await mountNav()
    expect(h.openLoginModal).not.toHaveBeenCalled()
  })

  it('does not open it when user authentication is disabled', async () => {
    h.authConfig.userAuthenticationEnabled = false
    h.authConfig.enableSkipLogin = true
    wrapper = await mountNav()
    expect(h.openLoginModal).not.toHaveBeenCalled()
  })

  it('does not open it for an authenticated user', async () => {
    h.authConfig.enableSkipLogin = true
    h.isAuthenticated.value = true
    wrapper = await mountNav()
    expect(h.openLoginModal).not.toHaveBeenCalled()
  })
})

describe('NavBar account menu', () => {
  beforeEach(() => {
    h.isAuthenticated.value = true
  })

  it('labels the account actions', async () => {
    h.isRunningAs.value = true
    wrapper = await mountNav()
    const body = await openUserMenu(wrapper)
    expect(body.find('[data-testid="account-menu-api-keys"]').text()).toBe(tr('components.userBar.apiKeys'))
    expect(body.find('[data-testid="account-menu-run-as"]').text()).toBe(tr('components.welcome.runas'))
    expect(body.find('[data-testid="account-menu-end-run-as"]').text()).toBe(tr('auth.endRunAs'))
    expect(body.text()).toContain(tr('components.userBar.signout'))
  })

  it('offers Run as only with the run-as permission', async () => {
    h.hasPermission.mockImplementation((p: string) => p !== 'admin:run-as')
    wrapper = await mountNav()
    const body = await openUserMenu(wrapper)
    expect(body.find('[data-testid="account-menu-api-keys"]').exists()).toBe(true)
    expect(body.find('[data-testid="account-menu-run-as"]').exists()).toBe(false)
  })

  it('checks the run-as permission by name', async () => {
    h.hasPermission.mockImplementation((p: string) => p === 'admin:run-as')
    wrapper = await mountNav()
    const body = await openUserMenu(wrapper)
    expect(body.find('[data-testid="account-menu-run-as"]').exists()).toBe(true)
  })

  it('opens API keys', async () => {
    wrapper = await mountNav()
    const body = await openUserMenu(wrapper)
    await body.find('[data-testid="account-menu-api-keys"]').trigger('click')
    await flushPromises()
    expect(h.push).toHaveBeenCalledWith('/profile/api-keys')
  })

  it('signs out and logs a failed logout', async () => {
    h.logout.mockRejectedValueOnce(new Error('offline'))
    wrapper = await mountNav()
    const body = await openUserMenu(wrapper)
    const signOut = body
      .findAll('.v-list-item')
      .find(i => i.text().includes(tr('components.userBar.signout')))!
    await signOut.trigger('click')
    await flushPromises()
    expect(h.logout).toHaveBeenCalledTimes(1)
    expect(logger.error).toHaveBeenCalled()
  })

  it('disables End Run As while ending and re-enables it after a failure', async () => {
    h.isRunningAs.value = true
    let reject: (e: unknown) => void = () => {}
    h.endRunAs.mockReturnValueOnce(new Promise((_r, rj) => { reject = rj }))
    wrapper = await mountNav()
    const body = await openUserMenu(wrapper)
    const item = () => body.find('[data-testid="account-menu-end-run-as"]')
    expect(item().classes()).not.toContain('v-list-item--disabled')
    await item().trigger('click')
    await flushPromises()
    expect(h.endRunAs).toHaveBeenCalledTimes(1)
    expect(item().classes()).toContain('v-list-item--disabled')
    reject(new Error('nope'))
    await flushPromises()
    expect(logger.error).toHaveBeenCalled()
    expect(item().classes()).not.toContain('v-list-item--disabled')
  })

  it.each([
    [undefined, '/plugins/p1'],
    ['settings//', '/plugins/p1/settings'],
  ])('routes a plugin account item with path %s to %s', async (path, expected) => {
    vi.mocked(usePluginMounts).mockImplementation((surface: string) => ({
      items: computed(() =>
        surface === 'account-menu'
          ? [
              {
                key: 'plugin:p1:item',
                pluginId: 'p1',
                itemId: 'item',
                surface: 'account-menu' as const,
                name: 'Item',
                path,
                order: 1,
                visible: true,
              },
            ]
          : []
      ),
    }))
    wrapper = await mountNav()
    const body = await openUserMenu(wrapper)
    await body.find('[data-testid="account-menu-plugin:p1:item"]').trigger('click')
    expect(h.push).toHaveBeenCalledWith(expected)
  })
})

