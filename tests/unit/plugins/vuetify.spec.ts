/**
 * Unit Tests: Vuetify Plugin Configuration
 * Tests for src/plugins/vuetify.ts
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createVuetifyInstance } from '@/plugins/vuetify'

describe('Vuetify Plugin', () => {
  describe('createVuetifyInstance', () => {
    it('should create a Vuetify instance with default configuration', () => {
      const vuetify = createVuetifyInstance()

      expect(vuetify).toBeDefined()
      expect(vuetify).toHaveProperty('theme')
      expect(vuetify).toHaveProperty('defaults')
    })

    it('should use light theme as default', () => {
      const vuetify = createVuetifyInstance()

      expect(vuetify.theme.global.name.value).toBe('light')
    })

    it('should have default primary color configured', () => {
      const vuetify = createVuetifyInstance()

      const lightTheme = vuetify.theme.themes.value.light
      expect(lightTheme.colors.primary).toBe('#1f425a')
    })

    it('should accept custom primary color override', () => {
      const customColor = '#ff0000'
      const vuetify = createVuetifyInstance(customColor)

      const lightTheme = vuetify.theme.themes.value.light
      expect(lightTheme.colors.primary).toBe(customColor)
    })

    it('should use default primary color when null is passed', () => {
      const vuetify = createVuetifyInstance(null)

      const lightTheme = vuetify.theme.themes.value.light
      expect(lightTheme.colors.primary).toBe('#1f425a')
    })

    it('should use default primary color when undefined is passed', () => {
      const vuetify = createVuetifyInstance(undefined)

      const lightTheme = vuetify.theme.themes.value.light
      expect(lightTheme.colors.primary).toBe('#1f425a')
    })
  })

  describe('theme colors', () => {
    let vuetify: ReturnType<typeof createVuetifyInstance>

    beforeEach(() => {
      vuetify = createVuetifyInstance()
    })

    it('should configure Atlas primary color', () => {
      const lightTheme = vuetify.theme.themes.value.light
      expect(lightTheme.colors.primary).toBe('#1f425a')
    })

    it('should configure secondary color', () => {
      const lightTheme = vuetify.theme.themes.value.light
      expect(lightTheme.colors.secondary).toBe('#424242')
    })

    it('should configure accent color', () => {
      const lightTheme = vuetify.theme.themes.value.light
      expect(lightTheme.colors.accent).toBe('#2d5f7f')
    })

    it('should configure error color', () => {
      const lightTheme = vuetify.theme.themes.value.light
      expect(lightTheme.colors.error).toBe('#FF5252')
    })

    it('should configure info color', () => {
      const lightTheme = vuetify.theme.themes.value.light
      expect(lightTheme.colors.info).toBe('#2196F3')
    })

    it('should configure success color', () => {
      const lightTheme = vuetify.theme.themes.value.light
      expect(lightTheme.colors.success).toBe('#4CAF50')
    })

    it('should configure warning color', () => {
      const lightTheme = vuetify.theme.themes.value.light
      expect(lightTheme.colors.warning).toBe('#FB8C00')
    })

    it('should configure custom orange accent color', () => {
      const lightTheme = vuetify.theme.themes.value.light
      expect(lightTheme.colors.orange).toBe('#eb6622')
    })

    it('should configure background color', () => {
      const lightTheme = vuetify.theme.themes.value.light
      expect(lightTheme.colors.background).toBe('#f2f0f1')
    })

    it('should configure surface color', () => {
      const lightTheme = vuetify.theme.themes.value.light
      expect(lightTheme.colors.surface).toBe('#FFFFFF')
    })

    it('should have all required Material Design colors', () => {
      const lightTheme = vuetify.theme.themes.value.light
      const colors = lightTheme.colors

      expect(colors).toHaveProperty('primary')
      expect(colors).toHaveProperty('secondary')
      expect(colors).toHaveProperty('accent')
      expect(colors).toHaveProperty('error')
      expect(colors).toHaveProperty('info')
      expect(colors).toHaveProperty('success')
      expect(colors).toHaveProperty('warning')
    })

    it('should have Atlas-specific custom colors', () => {
      const lightTheme = vuetify.theme.themes.value.light
      const colors = lightTheme.colors

      expect(colors).toHaveProperty('orange')
      expect(colors).toHaveProperty('background')
      expect(colors).toHaveProperty('surface')
    })
  })

  describe('component defaults', () => {
    let vuetify: ReturnType<typeof createVuetifyInstance>

    beforeEach(() => {
      vuetify = createVuetifyInstance()
    })

    it('should configure VBtn defaults', () => {
      const btnDefaults = vuetify.defaults.value.VBtn

      expect(btnDefaults).toBeDefined()
      expect(btnDefaults?.variant).toBe('flat')
      expect(btnDefaults?.color).toBe('primary')
    })

    it('should configure VCard defaults', () => {
      const cardDefaults = vuetify.defaults.value.VCard

      expect(cardDefaults).toBeDefined()
      expect(cardDefaults?.variant).toBe('elevated')
      expect(cardDefaults?.elevation).toBe(2)
    })

    it('should configure VTextField defaults', () => {
      const textFieldDefaults = vuetify.defaults.value.VTextField

      expect(textFieldDefaults).toBeDefined()
      expect(textFieldDefaults?.variant).toBe('outlined')
      expect(textFieldDefaults?.density).toBe('comfortable')
    })

    it('should configure VSelect defaults', () => {
      const selectDefaults = vuetify.defaults.value.VSelect

      expect(selectDefaults).toBeDefined()
      expect(selectDefaults?.variant).toBe('outlined')
      expect(selectDefaults?.density).toBe('comfortable')
    })

    it('should configure VAutocomplete defaults', () => {
      const autocompleteDefaults = vuetify.defaults.value.VAutocomplete

      expect(autocompleteDefaults).toBeDefined()
      expect(autocompleteDefaults?.variant).toBe('outlined')
      expect(autocompleteDefaults?.density).toBe('comfortable')
    })

    it('should have consistent form component styling', () => {
      const textFieldDefaults = vuetify.defaults.value.VTextField
      const selectDefaults = vuetify.defaults.value.VSelect
      const autocompleteDefaults = vuetify.defaults.value.VAutocomplete

      // All form components should have same variant and density
      expect(textFieldDefaults?.variant).toBe('outlined')
      expect(selectDefaults?.variant).toBe('outlined')
      expect(autocompleteDefaults?.variant).toBe('outlined')

      expect(textFieldDefaults?.density).toBe('comfortable')
      expect(selectDefaults?.density).toBe('comfortable')
      expect(autocompleteDefaults?.density).toBe('comfortable')
    })
  })

  describe('Vuetify instance structure', () => {
    let vuetify: ReturnType<typeof createVuetifyInstance>

    beforeEach(() => {
      vuetify = createVuetifyInstance()
    })

    it('should have theme property', () => {
      expect(vuetify).toHaveProperty('theme')
      expect(vuetify.theme).toBeDefined()
    })

    it('should have defaults property', () => {
      expect(vuetify).toHaveProperty('defaults')
      expect(vuetify.defaults).toBeDefined()
    })

    it('should have display property', () => {
      expect(vuetify).toHaveProperty('display')
      expect(vuetify.display).toBeDefined()
    })

    it('should have locale property', () => {
      expect(vuetify).toHaveProperty('locale')
      expect(vuetify.locale).toBeDefined()
    })

    it('should be a valid Vuetify instance', () => {
      // Check that it has the expected Vuetify structure
      expect(vuetify).toHaveProperty('install')
      expect(typeof vuetify.install).toBe('function')
    })
  })

  describe('default export', () => {
    it('should export a default Vuetify instance', async () => {
      const vuetifyModule = await import('@/plugins/vuetify')
      const defaultVuetify = vuetifyModule.default

      expect(defaultVuetify).toBeDefined()
      expect(defaultVuetify).toHaveProperty('theme')
      expect(defaultVuetify).toHaveProperty('defaults')
    })

    it('should use default primary color in default export', async () => {
      const vuetifyModule = await import('@/plugins/vuetify')
      const defaultVuetify = vuetifyModule.default

      const lightTheme = defaultVuetify.theme.themes.value.light
      expect(lightTheme.colors.primary).toBe('#1f425a')
    })

    it('should be ready to use without configuration', async () => {
      const vuetifyModule = await import('@/plugins/vuetify')
      const defaultVuetify = vuetifyModule.default

      // Should have all required properties configured
      expect(defaultVuetify.theme.global.name.value).toBe('light')
      expect(defaultVuetify.defaults.value.VBtn).toBeDefined()
      expect(defaultVuetify.defaults.value.VCard).toBeDefined()
    })
  })

  describe('theme customization', () => {
    it('should preserve other colors when overriding primary', () => {
      const customColor = '#00ff00'
      const vuetify = createVuetifyInstance(customColor)

      const lightTheme = vuetify.theme.themes.value.light

      expect(lightTheme.colors.primary).toBe(customColor)
      expect(lightTheme.colors.secondary).toBe('#424242')
      expect(lightTheme.colors.error).toBe('#FF5252')
      expect(lightTheme.colors.orange).toBe('#eb6622')
    })

    it('should accept different hex color formats', () => {
      const colors = [
        '#FF0000',
        '#00ff00',
        '#0000FF',
        '#AbCdEf',
      ]

      colors.forEach(color => {
        const vuetify = createVuetifyInstance(color)
        const lightTheme = vuetify.theme.themes.value.light
        expect(lightTheme.colors.primary).toBe(color)
      })
    })

    it('should create independent instances', () => {
      const vuetify1 = createVuetifyInstance('#ff0000')
      const vuetify2 = createVuetifyInstance('#00ff00')

      const theme1 = vuetify1.theme.themes.value.light
      const theme2 = vuetify2.theme.themes.value.light

      expect(theme1.colors.primary).toBe('#ff0000')
      expect(theme2.colors.primary).toBe('#00ff00')
    })
  })

  describe('Material Design compliance', () => {
    let vuetify: ReturnType<typeof createVuetifyInstance>

    beforeEach(() => {
      vuetify = createVuetifyInstance()
    })

    it('should use Material Design color names', () => {
      const lightTheme = vuetify.theme.themes.value.light
      const colors = lightTheme.colors

      // Check for Material Design semantic color names
      expect(colors).toHaveProperty('primary')
      expect(colors).toHaveProperty('secondary')
      expect(colors).toHaveProperty('error')
      expect(colors).toHaveProperty('info')
      expect(colors).toHaveProperty('success')
      expect(colors).toHaveProperty('warning')
      expect(colors).toHaveProperty('background')
      expect(colors).toHaveProperty('surface')
    })

    it('should use Material Design component variants', () => {
      // Check that components use valid Material Design variants
      expect(vuetify.defaults.value.VBtn?.variant).toBe('flat')
      expect(vuetify.defaults.value.VCard?.variant).toBe('elevated')
      expect(vuetify.defaults.value.VTextField?.variant).toBe('outlined')
    })

    it('should use Material Design density values', () => {
      // Check that form components use valid density values
      const density = 'comfortable'
      expect(vuetify.defaults.value.VTextField?.density).toBe(density)
      expect(vuetify.defaults.value.VSelect?.density).toBe(density)
      expect(vuetify.defaults.value.VAutocomplete?.density).toBe(density)
    })

    it('should have valid elevation values', () => {
      const cardElevation = vuetify.defaults.value.VCard?.elevation
      expect(cardElevation).toBeDefined()
      expect(typeof cardElevation).toBe('number')
      expect(cardElevation).toBeGreaterThanOrEqual(0)
      expect(cardElevation).toBeLessThanOrEqual(24)
    })
  })

  describe('color hex format validation', () => {
    let vuetify: ReturnType<typeof createVuetifyInstance>

    beforeEach(() => {
      vuetify = createVuetifyInstance()
    })

    it('should have colors in hex format', () => {
      const lightTheme = vuetify.theme.themes.value.light
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/

      expect(lightTheme.colors.primary).toMatch(hexColorRegex)
      expect(lightTheme.colors.secondary).toMatch(hexColorRegex)
      expect(lightTheme.colors.accent).toMatch(hexColorRegex)
      expect(lightTheme.colors.error).toMatch(hexColorRegex)
      expect(lightTheme.colors.info).toMatch(hexColorRegex)
      expect(lightTheme.colors.success).toMatch(hexColorRegex)
      expect(lightTheme.colors.warning).toMatch(hexColorRegex)
      expect(lightTheme.colors.orange).toMatch(hexColorRegex)
      expect(lightTheme.colors.background).toMatch(hexColorRegex)
      expect(lightTheme.colors.surface).toMatch(hexColorRegex)
    })
  })

  describe('backwards compatibility', () => {
    it('should export createVuetifyInstance function', async () => {
      const vuetifyModule = await import('@/plugins/vuetify')
      expect(vuetifyModule.createVuetifyInstance).toBeDefined()
      expect(typeof vuetifyModule.createVuetifyInstance).toBe('function')
    })

    it('should export default instance', async () => {
      const vuetifyModule = await import('@/plugins/vuetify')
      expect(vuetifyModule.default).toBeDefined()
    })

    it('should maintain consistent API', () => {
      // Creating multiple instances should work consistently
      const vuetify1 = createVuetifyInstance()
      const vuetify2 = createVuetifyInstance()

      expect(vuetify1.theme.global.name.value).toBe(vuetify2.theme.global.name.value)
      expect(vuetify1.defaults.value.VBtn?.variant).toBe(vuetify2.defaults.value.VBtn?.variant)
    })
  })
})
