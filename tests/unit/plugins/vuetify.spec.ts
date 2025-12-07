/**
 * Vuetify Plugin Tests
 * Tests for Vuetify instance creation
 */
import { describe, it, expect } from 'vitest'
import { createVuetifyInstance } from '@/plugins/vuetify'

describe('Vuetify Plugin', () => {
  describe('createVuetifyInstance', () => {
    it('should create Vuetify instance with default primary color', () => {
      const vuetify = createVuetifyInstance()

      expect(vuetify).toBeDefined()
      expect(vuetify.theme).toBeDefined()
    })

    it('should use default primary color when none provided', () => {
      const vuetify = createVuetifyInstance()

      // Access theme colors
      const theme = vuetify.theme.themes.value.light
      expect(theme.colors.primary).toBe('#1f425a')
    })

    it('should use custom primary color when provided', () => {
      const customColor = '#ff0000'
      const vuetify = createVuetifyInstance(customColor)

      const theme = vuetify.theme.themes.value.light
      expect(theme.colors.primary).toBe(customColor)
    })

    it('should use default color when null is provided', () => {
      const vuetify = createVuetifyInstance(null)

      const theme = vuetify.theme.themes.value.light
      expect(theme.colors.primary).toBe('#1f425a')
    })

    it('should have light as default theme', () => {
      const vuetify = createVuetifyInstance()

      expect(vuetify.theme.global.name.value).toBe('light')
    })

    it('should include secondary color', () => {
      const vuetify = createVuetifyInstance()

      const theme = vuetify.theme.themes.value.light
      expect(theme.colors.secondary).toBe('#424242')
    })

    it('should include accent color', () => {
      const vuetify = createVuetifyInstance()

      const theme = vuetify.theme.themes.value.light
      expect(theme.colors.accent).toBe('#2d5f7f')
    })

    it('should include error color', () => {
      const vuetify = createVuetifyInstance()

      const theme = vuetify.theme.themes.value.light
      expect(theme.colors.error).toBe('#FF5252')
    })

    it('should include success color', () => {
      const vuetify = createVuetifyInstance()

      const theme = vuetify.theme.themes.value.light
      expect(theme.colors.success).toBe('#4CAF50')
    })

    it('should include warning color', () => {
      const vuetify = createVuetifyInstance()

      const theme = vuetify.theme.themes.value.light
      expect(theme.colors.warning).toBe('#FB8C00')
    })

    it('should include orange accent color', () => {
      const vuetify = createVuetifyInstance()

      const theme = vuetify.theme.themes.value.light
      expect(theme.colors.orange).toBe('#eb6622')
    })

    it('should include background color', () => {
      const vuetify = createVuetifyInstance()

      const theme = vuetify.theme.themes.value.light
      expect(theme.colors.background).toBe('#f2f0f1')
    })
  })
})
