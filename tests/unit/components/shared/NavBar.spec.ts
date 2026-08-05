/**
 * NavBar Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { computed, ref } from 'vue'
import NavBar from '@/components/shared/NavBar.vue'
import { generatePluginMenuItems } from '@/plugins/navigation/PluginMenuIntegration.ts'
import { usePermissions } from '@/composables/usePermissions'
import { usePluginMounts } from '@/composables/usePluginMounts'

// Mock vue-router
const mockPush = vi.fn()
const mockIsReady = vi.fn().mockResolvedValue(true)
const mockAfterEach = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
    isReady: mockIsReady,
    currentRoute: ref({ path: '/cohorts' }),
    afterEach: mockAfterEach
  })
}))

// Mock composables
const mockLogout = vi.fn()
const mockOpenLoginModal = vi.fn()
const mockIsAuthenticated = ref(false)

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    userDisplayName: ref('Test User'),
    logout: mockLogout,
    openLoginModal: mockOpenLoginModal
  })
}))

const mockPermissions = {
  hasPermission: () => true,
  hasAnyPermission: () => true,
  hasAllPermissions: () => true,
  cacheHitRate: ref(0),
  clearCache: vi.fn(),
}

// usePermissions reads from the auth store, which isn't initialised in this
// suite; default it to admin so the existing config-button assertions keep
// passing, and let individual tests override it.
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: vi.fn(() => mockPermissions),
}))

vi.mock('@/composables/usePluginMounts', () => ({
  usePluginMounts: vi.fn(() => ({ items: computed(() => []) })),
}))

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => ref(fallback)
  })
}))

// Mock stores
const mockOpenConfigPanel = vi.fn()
const mockCloseConfigPanel = vi.fn()

vi.mock('@/stores/ui', () => ({
  useUIStore: () => ({
    configPanelState: {
      isOpen: false
    },
    openConfigPanel: mockOpenConfigPanel,
    closeConfigPanel: mockCloseConfigPanel
  })
}))

// Mock auth config
vi.mock('@/config/auth.config', () => ({
  getAuthConfig: () => ({
    userAuthenticationEnabled: true,
    enableSkipLogin: false,
  }),
}))

// Mock plugin-related modules
vi.mock('@/plugins/navigation/PluginMenuIntegration.ts', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  generatePluginMenuItems: vi.fn(() => [])
}))

vi.mock('@/plugins/core/PluginRegistry', () => ({
  pluginRegistry: {
    getAllPlugins: () => [],
    onStateChange: vi.fn()
  }
}))

vi.mock('@/services/PluginConfigService', () => ({
  pluginConfigService: {
    getLogoUrl: () => null,
    isCoreNavigationItemEnabled: () => true,
    onChange: vi.fn(),
    showFeedbackButton: () => true,
    showLanguageSelector: () => true,
    showConfigButton: () => true,
    showUserMenu: () => true,
    getFeedbackUrl: () => 'https://forms.office.com/r/2JzrYy1yDP',
    getLogoNavigateTo: () => '/'
  }
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Mock child components
vi.mock('@/components/auth/LoginModal.vue', () => ({
  default: {
    name: 'LoginModal',
    template: '<div class="login-modal"></div>'
  }
}))

vi.mock('@/components/LanguageSelector.vue', () => ({
  default: {
    name: 'LanguageSelector',
    template: '<div class="language-selector"></div>'
  }
}))

const vuetify = createVuetify({ components, directives })

const mountOptions = {
  global: {
    plugins: [vuetify],
    stubs: {
      LoginModal: true,
      LanguageSelector: true,
      NotificationInbox: true
    }
  }
}

function mountComponent(options = {}) {
  return mount(NavBar, {
    ...mountOptions,
    ...options
  })
}

describe('NavBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAuthenticated.value = false
    vi.mocked(generatePluginMenuItems).mockReturnValue([])
    vi.mocked(usePermissions).mockReturnValue(mockPermissions)
    vi.mocked(usePluginMounts).mockReturnValue({ items: computed(() => []) })
  })

  describe('Component Rendering', () => {
    it('should render the navigation bar', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.nav-bar').exists()).toBe(true)
    })

    it('should render the OHDSI logo when no custom logo is configured', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.nav-bar__ohdsi-logo').exists()).toBe(true)
    })

    it('should render the ATLAS logo when no custom logo is configured', () => {
      const wrapper = mountComponent()
      const atlasLogo = wrapper.find('.nav-bar__logo img')
      expect(atlasLogo.exists()).toBe(true)
      expect(atlasLogo.attributes('alt')).toBe('ATLAS')
    })

    it('should render LoginModal component', () => {
      const wrapper = mountComponent()
      expect(wrapper.findComponent({ name: 'LoginModal' }).exists()).toBe(true)
    })

    it('should render LanguageSelector component', () => {
      const wrapper = mountComponent()
      expect(wrapper.findComponent({ name: 'LanguageSelector' }).exists()).toBe(true)
    })

    it('should render feedback button', () => {
      const wrapper = mountComponent()
      const feedbackBtn = wrapper.findAll('.v-btn').find(btn => btn.text().includes('Feedback'))
      expect(feedbackBtn).toBeDefined()
      expect(feedbackBtn?.attributes('href')).toBe('https://forms.office.com/r/2JzrYy1yDP')
      expect(feedbackBtn?.attributes('target')).toBe('_blank')
    })

    it('should render configuration button', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const configBtn = buttons.find(btn => {
        return btn.attributes('aria-label') === 'Open configuration panel'
      })
      expect(configBtn).toBeDefined()
    })
  })

  describe('Navigation Items', () => {
    it('should render navigation items on desktop', () => {
      const wrapper = mountComponent()
      const nav = wrapper.find('ul.nav-bar__nav.d-none.d-md-flex')
      expect(nav.exists()).toBe(true)
    })

    it('should expose the nav landmark with an accessible label', () => {
      const wrapper = mountComponent()
      const nav = wrapper.find('nav.nav-bar__nav-wrapper')
      expect(nav.exists()).toBe(true)
      expect(nav.attributes('aria-label')).toBe('Main')
    })

    it('should render navigation list with items', () => {
      const wrapper = mountComponent()
      const navList = wrapper.find('.nav-bar__nav-list')
      expect(navList.exists()).toBe(true)
      const navItems = navList.findAll('.nav-bar__nav-item')
      expect(navItems.length).toBeGreaterThan(0)
    })

    it('should render navigation dropdown for mobile', () => {
      const wrapper = mountComponent()
      const navDropdown = wrapper.find('.nav-bar__nav-dropdown.d-md-none')
      expect(navDropdown.exists()).toBe(true)
    })

    it('should mark active navigation item with correct class', () => {
      const wrapper = mountComponent()
      const activeItem = wrapper.find('.nav-bar__nav-item--active')
      expect(activeItem.exists()).toBe(true)
    })

    it('should render navigation links with correct attributes', () => {
      const wrapper = mountComponent()
      const firstLink = wrapper.find('.nav-bar__nav-link')
      expect(firstLink.exists()).toBe(true)
      expect(firstLink.attributes('href')).toBe('#')
    })

    it('renders plugin items anchored between core items', async () => {
      vi.mocked(generatePluginMenuItems).mockReturnValue([
        {
          id: 'p1-tools',
          pluginId: 'p1',
          name: 'Tools',
          route: '/plugins/p1/tools',
          order: 1,
          visible: true,
          insertAfter: 'datasources',
        },
      ])
      const wrapper = mountComponent()
      await flushPromises()
      const labels = wrapper.findAll('.nav-bar__nav-list .nav-bar__nav-link').map((a) => a.text())
      expect(labels.indexOf('Tools')).toBe(labels.findIndex((l) => /data/i.test(l)) + 1)
    })
  })

  describe('Authentication UI', () => {
    it('should render sign in button when not authenticated', () => {
      const wrapper = mountComponent()
      const signInBtn = wrapper.findAll('.v-btn').find(btn => btn.text().includes('Sign In'))
      expect(signInBtn).toBeDefined()
    })

    it('should not render user menu when not authenticated', () => {
      const wrapper = mountComponent()
      const userDiv = wrapper.find('.nav-bar__user')
      expect(userDiv.exists()).toBe(false)
    })
  })

  describe('Logo Interactions', () => {
    it('should navigate to home when logo is clicked', async () => {
      const wrapper = mountComponent()
      const logo = wrapper.find('.nav-bar__logo')

      await logo.trigger('click')
      await flushPromises()

      expect(mockIsReady).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('should navigate to home on logo keyboard interaction', () => {
      const wrapper = mountComponent()
      const logo = wrapper.find('.nav-bar__logo')

      expect(logo.element.tagName).toBe('BUTTON')
      expect(logo.attributes('type')).toBe('button')
    })
  })

  describe('Navigation Interactions', () => {
    it('should navigate when navigation link is clicked', async () => {
      const wrapper = mountComponent()
      const firstLink = wrapper.find('.nav-bar__nav-link')

      await firstLink.trigger('click')
      await flushPromises()

      expect(mockIsReady).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalled()
    })

    it('should handle navigation link click event', async () => {
      const wrapper = mountComponent()
      const firstLink = wrapper.find('.nav-bar__nav-link')

      await firstLink.trigger('click')
      await flushPromises()

      // Verify navigation was attempted
      expect(mockIsReady).toHaveBeenCalled()
    })
  })

  describe('Configuration Panel', () => {
    it('should open config panel when config button is clicked', async () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const configBtn = buttons.find(btn => {
        return btn.attributes('aria-label') === 'Open configuration panel'
      })

      expect(configBtn).toBeDefined()
      await configBtn?.trigger('click')

      expect(mockOpenConfigPanel).toHaveBeenCalled()
    })
  })

  describe('Authentication Actions', () => {
    it('should open login modal when sign in button is clicked', async () => {
      const wrapper = mountComponent()
      const signInBtn = wrapper.findAll('.v-btn').find(btn => btn.text().includes('Sign In'))

      await signInBtn?.trigger('click')

      expect(mockOpenLoginModal).toHaveBeenCalled()
    })
  })

  describe('Mobile Menu', () => {
    it('should render v-menu for mobile navigation', () => {
      const wrapper = mountComponent()
      const menus = wrapper.findAllComponents({ name: 'VMenu' })
      // Should have at least one menu (mobile nav dropdown)
      expect(menus.length).toBeGreaterThan(0)
    })

    it('should have mobile dropdown navigation', () => {
      const wrapper = mountComponent()
      const navDropdown = wrapper.find('.nav-bar__nav-dropdown')
      expect(navDropdown.exists()).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-label on config button', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const configBtn = buttons.find(btn => {
        return btn.attributes('aria-label') === 'Open configuration panel'
      })
      expect(configBtn).toBeDefined()
      expect(configBtn?.attributes('aria-label')).toBe('Open configuration panel')
    })

    it('should render the logo as a native button', () => {
      const wrapper = mountComponent()
      const logo = wrapper.find('.nav-bar__logo')
      expect(logo.element.tagName).toBe('BUTTON')
      expect(logo.attributes('type')).toBe('button')
      expect(logo.attributes('aria-label')).toBeTruthy()
    })

    it('should have alt text on images', () => {
      const wrapper = mountComponent()
      const ohdsiLogo = wrapper.find('.nav-bar__ohdsi-logo')
      expect(ohdsiLogo.attributes('alt')).toBe('OHDSI')

      const atlasLogo = wrapper.find('.nav-bar__logo img')
      expect(atlasLogo.attributes('alt')).toBe('ATLAS')
    })

    it('should have proper external link attributes on feedback button', () => {
      const wrapper = mountComponent()
      const feedbackBtn = wrapper.findAll('.v-btn').find(btn => btn.text().includes('Feedback'))
      expect(feedbackBtn?.attributes('target')).toBe('_blank')
    })
  })

  describe('Conditional Rendering', () => {
    it('should show auth section when not authenticated', () => {
      const wrapper = mountComponent()
      const authDiv = wrapper.find('.nav-bar__auth')
      expect(authDiv.exists()).toBe(true)
    })

    it('should render visible navigation items only', () => {
      const wrapper = mountComponent()
      const navItems = wrapper.findAll('.nav-bar__nav-item')

      // All items should be visible (based on mock returning true)
      navItems.forEach(item => {
        expect(item.isVisible()).toBe(true)
      })
    })
  })

  describe('Styling', () => {
    it('should apply correct CSS classes to navigation bar', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.nav-bar').exists()).toBe(true)
      expect(wrapper.find('.nav-bar__container').exists()).toBe(true)
    })

    it('should apply active state styling to active navigation item', () => {
      const wrapper = mountComponent()
      const activeItem = wrapper.find('.nav-bar__nav-item--active')
      expect(activeItem.exists()).toBe(true)
    })

    it('should have proper layout classes for responsive design', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.d-none.d-md-flex').exists()).toBe(true)
      expect(wrapper.find('.d-md-none').exists()).toBe(true)
    })
  })

  describe('Plugin admin tabs', () => {
    it('shows the config cog when a plugin supplies the only admin tab', async () => {
      vi.mocked(usePermissions).mockReturnValue({
        hasPermission: () => false,
        hasAnyPermission: () => false,
        hasAllPermissions: () => false,
        cacheHitRate: ref(0),
        clearCache: vi.fn(),
      })
      vi.mocked(usePluginMounts).mockReturnValue({
        items: computed(() => [
          {
            key: 'plugin:p1:audit',
            pluginId: 'p1',
            itemId: 'audit',
            surface: 'admin-tabs' as const,
            name: 'Audit',
            order: 10,
            visible: true,
          },
        ]),
      })

      const wrapper = mount(NavBar, mountOptions)
      await flushPromises()

      expect(wrapper.find('[data-testid="nav-config"]').exists()).toBe(true)
    })

    it('hides the config cog with no permissions and no plugin tabs', async () => {
      vi.mocked(usePermissions).mockReturnValue({
        hasPermission: () => false,
        hasAnyPermission: () => false,
        hasAllPermissions: () => false,
        cacheHitRate: ref(0),
        clearCache: vi.fn(),
      })

      const wrapper = mount(NavBar, mountOptions)
      await flushPromises()

      expect(wrapper.find('[data-testid="nav-config"]').exists()).toBe(false)
    })
  })

  describe('Plugin account menu', () => {
    it('renders plugin account menu items above sign out', async () => {
      mockIsAuthenticated.value = true
      vi.mocked(usePluginMounts).mockImplementation((surface: string) => ({
        items: computed(() =>
          surface === 'account-menu'
            ? [
                {
                  key: 'plugin:p1:profile',
                  pluginId: 'p1',
                  itemId: 'profile',
                  surface: 'account-menu' as const,
                  name: 'My Profile',
                  path: 'profile',
                  icon: 'mdi-account',
                  order: 10,
                  visible: true,
                },
              ]
            : []
        ),
      }))

      const wrapper = mount(NavBar, mountOptions)
      await flushPromises()
      await wrapper.find('.nav-bar__user button').trigger('click')
      await flushPromises()

      const body = new DOMWrapper(document.body)
      const item = body.find('[data-testid="account-menu-plugin:p1:profile"]')
      expect(item.exists()).toBe(true)

      await item.trigger('click')
      expect(mockPush).toHaveBeenCalledWith('/plugins/p1/profile')
    })

    it('does not render a divider when there are no plugin account items', async () => {
      mockIsAuthenticated.value = true

      const wrapper = mount(NavBar, mountOptions)
      await flushPromises()
      await wrapper.find('.nav-bar__user button').trigger('click')
      await flushPromises()

      const body = new DOMWrapper(document.body)
      expect(body.find('.v-divider').exists()).toBe(false)
    })
  })
})
