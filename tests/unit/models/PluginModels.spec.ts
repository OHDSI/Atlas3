/**
 * Unit Tests: PluginModels
 * Tests for src/models/PluginModels.ts
 *
 * Comprehensive tests for Zod validation schemas:
 * - MenuItemConfigurationSchema
 * - PluginRegistrationSchema
 * - PluginManifestSchema
 * - DEFAULT_MANIFEST_SETTINGS constant
 */

import { describe, it, expect } from 'vitest'
import {
  MenuItemConfigurationSchema,
  PluginMountPointSchema,
  PluginRegistrationSchema,
  PluginManifestSchema,
  DEFAULT_MANIFEST_SETTINGS,
  type MenuItemConfiguration,
  type PluginRegistration,
  type PluginManifest,
} from '@/models/PluginModels'

describe('PluginModels', () => {
  describe('MenuItemConfigurationSchema', () => {
    describe('valid configurations', () => {
      it('validates minimal valid menu item', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(true)
      })

      it('validates menu item with all optional fields', () => {
        const menuItem: MenuItemConfiguration = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
          icon: 'mdi-test',
          order: 1,
          parentId: 'parent-menu',
          visible: true,
          badge: {
            content: 'New',
            color: 'red',
          },
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(true)
      })

      it('validates menu item with numeric badge content', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
          badge: {
            content: 42,
          },
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(true)
      })

      it('validates menu item with string badge content', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
          badge: {
            content: 'Beta',
          },
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(true)
      })

      it('validates menu item with badge color', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
          badge: {
            content: 5,
            color: 'primary',
          },
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(true)
      })

      it('validates menu item with zero order', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
          order: 0,
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(true)
      })

      it('validates menu item with negative order', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
          order: -1,
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(true)
      })

      it('validates menu item with visible false', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
          visible: false,
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(true)
      })
    })

    describe('invalid configurations', () => {
      it('rejects menu item without id', () => {
        const menuItem = {
          name: 'Test Menu',
          route: '/test',
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(false)
      })

      it('rejects menu item without name', () => {
        const menuItem = {
          id: 'test-menu',
          route: '/test',
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(false)
      })

      it('rejects menu item without route', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(false)
      })

      it('rejects menu item with non-string id', () => {
        const menuItem = {
          id: 123,
          name: 'Test Menu',
          route: '/test',
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(false)
      })

      it('rejects menu item with non-string name', () => {
        const menuItem = {
          id: 'test-menu',
          name: 123,
          route: '/test',
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(false)
      })

      it('rejects menu item with non-string route', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: 123,
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(false)
      })

      it('rejects menu item with non-number order', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
          order: '1',
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(false)
      })

      it('rejects menu item with non-boolean visible', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
          visible: 'true',
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(false)
      })

      it('rejects menu item with badge missing content', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
          badge: {
            color: 'red',
          },
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(false)
      })

      it('rejects menu item with badge content as boolean', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
          badge: {
            content: true,
          },
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(false)
      })

      it('rejects menu item with badge content as object', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
          badge: {
            content: { value: 'test' },
          },
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(false)
      })

      it('rejects menu item with badge as non-object', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
          badge: 'badge',
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('validates empty string values for required fields', () => {
        const menuItem = {
          id: '',
          name: '',
          route: '',
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(true)
      })

      it('validates menu item with extremely long strings', () => {
        const longString = 'a'.repeat(10000)
        const menuItem = {
          id: longString,
          name: longString,
          route: longString,
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(true)
      })

      it('validates menu item with special characters in strings', () => {
        const menuItem = {
          id: 'test-menu-@#$%',
          name: 'Test Menu <>&"\'',
          route: '/test?param=value&other=123',
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(true)
      })

      it('validates menu item with unicode characters', () => {
        const menuItem = {
          id: 'test-menu-你好',
          name: 'Test Menu 日本語 🚀',
          route: '/test/путь',
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(true)
      })

      it('validates menu item with very large order number', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
          order: Number.MAX_SAFE_INTEGER,
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(true)
      })

      it('validates menu item with badge content as zero', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
          badge: {
            content: 0,
          },
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(true)
      })

      it('validates menu item with badge content as empty string', () => {
        const menuItem = {
          id: 'test-menu',
          name: 'Test Menu',
          route: '/test',
          badge: {
            content: '',
          },
        }

        const result = MenuItemConfigurationSchema.safeParse(menuItem)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('PluginRegistrationSchema', () => {
    describe('valid configurations', () => {
      it('validates minimal valid plugin registration', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin with all optional fields', () => {
        const plugin: PluginRegistration = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [
            {
              id: 'menu-1',
              name: 'Menu 1',
              route: '/test/1',
            },
          ],
          activationConditions: {
            feature: 'enabled',
            minVersion: '2.0.0',
          },
          metadata: {
            author: 'Test Author',
            description: 'Test Description',
            homepage: 'https://example.com',
            icon: 'mdi-plugin',
          },
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin with multiple menu items', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [
            { id: 'menu-1', name: 'Menu 1', route: '/test/1' },
            { id: 'menu-2', name: 'Menu 2', route: '/test/2' },
            { id: 'menu-3', name: 'Menu 3', route: '/test/3' },
          ],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin id with lowercase letters', () => {
        const plugin = {
          id: 'testplugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin id with numbers', () => {
        const plugin = {
          id: 'test123plugin456',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin id with hyphens', () => {
        const plugin = {
          id: 'test-plugin-name',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin id with underscores', () => {
        const plugin = {
          id: 'test_plugin_name',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin id with mixed valid characters', () => {
        const plugin = {
          id: 'test-plugin_123',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin with complex activation conditions', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
          activationConditions: {
            feature: 'enabled',
            nested: {
              deep: {
                value: true,
              },
            },
            array: [1, 2, 3],
          },
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin metadata with only homepage URL', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
          metadata: {
            homepage: 'https://example.com',
          },
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin with semver version', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.2.3-beta.4+build.567',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })
    })

    describe('invalid configurations', () => {
      it('rejects plugin without id', () => {
        const plugin = {
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(false)
      })

      it('rejects plugin without name', () => {
        const plugin = {
          id: 'test-plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(false)
      })

      it('rejects plugin without version', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(false)
      })

      it('rejects plugin without entryPoint', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(false)
      })

      it('rejects plugin without menuItems', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(false)
      })

      it('rejects plugin id with uppercase letters', () => {
        const plugin = {
          id: 'Test-Plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(false)
      })

      it('rejects plugin id with spaces', () => {
        const plugin = {
          id: 'test plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(false)
      })

      it('rejects plugin id with special characters', () => {
        const plugin = {
          id: 'test@plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(false)
      })

      it('rejects plugin id with dots', () => {
        const plugin = {
          id: 'test.plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(false)
      })

      it('rejects plugin with empty name', () => {
        const plugin = {
          id: 'test-plugin',
          name: '',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(false)
      })

      it('rejects plugin with non-array menuItems', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: 'not-an-array',
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(false)
      })

      it('rejects plugin with invalid menu item', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [
            { id: 'menu-1', name: 'Menu 1' }, // missing route
          ],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(false)
      })

      it('rejects plugin metadata with invalid URL', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
          metadata: {
            homepage: 'not-a-valid-url',
          },
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(false)
      })

      it('rejects plugin metadata with non-object value', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
          metadata: 'not-an-object',
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('validates plugin with empty string version', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin with empty string entryPoint', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin with single character id', () => {
        const plugin = {
          id: 'a',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin with numeric id', () => {
        const plugin = {
          id: '123',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin with very long id', () => {
        const plugin = {
          id: 'a'.repeat(1000),
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin with empty activation conditions', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
          activationConditions: {},
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin with empty metadata', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
          metadata: {},
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })

      it('validates plugin metadata with URL containing special characters', () => {
        const plugin = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          entryPoint: '/plugins/test/main.js',
          menuItems: [],
          metadata: {
            homepage: 'https://example.com/path?query=value&other=123#fragment',
          },
        }

        const result = PluginRegistrationSchema.safeParse(plugin)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('PluginManifestSchema', () => {
    describe('valid configurations', () => {
      it('validates minimal valid manifest', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with plugins', () => {
        const manifest: PluginManifest = {
          version: '1.0.0',
          plugins: [
            {
              id: 'test-plugin',
              name: 'Test Plugin',
              version: '1.0.0',
              entryPoint: '/plugins/test/main.js',
              menuItems: [],
            },
          ],
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with all settings', () => {
        const manifest: PluginManifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            enableHotReload: true,
            loadTimeout: 5000,
            pluginsPath: '/custom/path',
            showLoadingIndicators: false,
            navigation: {
              enabledCoreItems: ['datasources', 'concepts'],
              disabledCoreItems: ['cohorts'],
            },
            theme: {
              primaryColor: '#1f425a',
              logoUrl: '/assets/logo.png',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with 6-digit hex color', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              primaryColor: '#ff0000',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with 3-digit hex color', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              primaryColor: '#f00',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with 8-digit hex color (with alpha)', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              primaryColor: '#ff0000ff',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with 4-digit hex color (with alpha)', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              primaryColor: '#f00f',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with lowercase hex color', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              primaryColor: '#abcdef',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with uppercase hex color', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              primaryColor: '#ABCDEF',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with mixed case hex color', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              primaryColor: '#AbCdEf',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with only navigation settings', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            navigation: {
              enabledCoreItems: ['datasources'],
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with only theme settings', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              logoUrl: '/logo.svg',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with empty navigation arrays', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            navigation: {
              enabledCoreItems: [],
              disabledCoreItems: [],
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with multiple plugins', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [
            {
              id: 'plugin-1',
              name: 'Plugin 1',
              version: '1.0.0',
              entryPoint: '/plugins/1/main.js',
              menuItems: [],
            },
            {
              id: 'plugin-2',
              name: 'Plugin 2',
              version: '2.0.0',
              entryPoint: '/plugins/2/main.js',
              menuItems: [],
            },
          ],
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with loadTimeout as zero', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            loadTimeout: 0,
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with very large loadTimeout', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            loadTimeout: Number.MAX_SAFE_INTEGER,
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })
    })

    describe('invalid configurations', () => {
      it('rejects manifest without version', () => {
        const manifest = {
          plugins: [],
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })

      it('rejects manifest without plugins', () => {
        const manifest = {
          version: '1.0.0',
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })

      it('rejects manifest with non-array plugins', () => {
        const manifest = {
          version: '1.0.0',
          plugins: 'not-an-array',
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })

      it('rejects manifest with invalid plugin', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [
            { id: 'test' }, // missing required fields
          ],
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })

      it('rejects manifest with hex color without hash', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              primaryColor: 'ff0000',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })

      it('rejects manifest with invalid hex color length (5 digits)', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              primaryColor: '#ff000',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })

      it('rejects manifest with invalid hex color length (7 digits)', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              primaryColor: '#ff00000',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })

      it('rejects manifest with invalid hex color characters', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              primaryColor: '#gggggg',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })

      it('rejects manifest with hex color containing spaces', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              primaryColor: '#ff 00 00',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })

      it('rejects manifest with non-boolean enableHotReload', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            enableHotReload: 'true',
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })

      it('rejects manifest with non-number loadTimeout', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            loadTimeout: '5000',
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })

      it('rejects manifest with non-string pluginsPath', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            pluginsPath: 123,
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })

      it('rejects manifest with non-boolean showLoadingIndicators', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            showLoadingIndicators: 1,
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })

      it('rejects manifest with non-array enabledCoreItems', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            navigation: {
              enabledCoreItems: 'datasources',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })

      it('rejects manifest with non-string items in enabledCoreItems', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            navigation: {
              enabledCoreItems: [123, 456],
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })

      it('rejects manifest with non-string logoUrl', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              logoUrl: 123,
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('validates manifest with empty version string', () => {
        const manifest = {
          version: '',
          plugins: [],
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with empty settings object', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {},
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with empty navigation object', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            navigation: {},
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with empty theme object', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {},
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with negative loadTimeout', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            loadTimeout: -1,
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with empty pluginsPath', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            pluginsPath: '',
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with special characters in pluginsPath', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            pluginsPath: '/path/to/plugins-dir_123',
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with black color (#000)', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              primaryColor: '#000',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with white color (#fff)', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              primaryColor: '#fff',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with transparent color (#0000)', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              primaryColor: '#0000',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with only disabledCoreItems', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            navigation: {
              disabledCoreItems: ['cohorts', 'reports'],
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('validates manifest with very long logoUrl', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [],
          settings: {
            theme: {
              logoUrl: '/path/to/logo/' + 'a'.repeat(1000) + '.png',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })
    })

    describe('nested validation', () => {
      it('validates complete manifest with nested structures', () => {
        const manifest: PluginManifest = {
          version: '2.0.0',
          plugins: [
            {
              id: 'plugin-1',
              name: 'Plugin One',
              version: '1.0.0',
              entryPoint: '/plugins/one/index.js',
              menuItems: [
                {
                  id: 'menu-1',
                  name: 'Menu One',
                  route: '/plugin-one',
                  icon: 'mdi-star',
                  order: 1,
                  visible: true,
                  badge: {
                    content: 'New',
                    color: 'primary',
                  },
                },
              ],
              activationConditions: {
                feature: 'advanced',
              },
              metadata: {
                author: 'Test Author',
                description: 'Test plugin',
                homepage: 'https://example.com',
                icon: 'mdi-plugin',
              },
            },
          ],
          settings: {
            enableHotReload: true,
            loadTimeout: 10000,
            pluginsPath: '/plugins',
            showLoadingIndicators: true,
            navigation: {
              enabledCoreItems: ['datasources', 'concepts'],
              disabledCoreItems: ['reports'],
            },
            theme: {
              primaryColor: '#1f425a',
              logoUrl: '/assets/custom-logo.png',
            },
          },
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(true)
      })

      it('rejects manifest with nested invalid plugin menu item', () => {
        const manifest = {
          version: '1.0.0',
          plugins: [
            {
              id: 'test-plugin',
              name: 'Test Plugin',
              version: '1.0.0',
              entryPoint: '/test.js',
              menuItems: [
                {
                  id: 'menu-1',
                  name: 'Menu',
                  route: '/test',
                },
                {
                  id: 'menu-2',
                  // missing name
                  route: '/test-2',
                },
              ],
            },
          ],
        }

        const result = PluginManifestSchema.safeParse(manifest)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('DEFAULT_MANIFEST_SETTINGS', () => {
    it('has correct enableHotReload value', () => {
      expect(DEFAULT_MANIFEST_SETTINGS).toHaveProperty('enableHotReload')
      expect(typeof DEFAULT_MANIFEST_SETTINGS.enableHotReload).toBe('boolean')
    })

    it('has correct loadTimeout value', () => {
      expect(DEFAULT_MANIFEST_SETTINGS).toHaveProperty('loadTimeout')
      expect(DEFAULT_MANIFEST_SETTINGS.loadTimeout).toBe(30000)
      expect(typeof DEFAULT_MANIFEST_SETTINGS.loadTimeout).toBe('number')
    })

    it('has correct pluginsPath value', () => {
      expect(DEFAULT_MANIFEST_SETTINGS).toHaveProperty('pluginsPath')
      expect(DEFAULT_MANIFEST_SETTINGS.pluginsPath).toBe('plugins')
      expect(typeof DEFAULT_MANIFEST_SETTINGS.pluginsPath).toBe('string')
    })

    it('has correct showLoadingIndicators value', () => {
      expect(DEFAULT_MANIFEST_SETTINGS).toHaveProperty('showLoadingIndicators')
      expect(DEFAULT_MANIFEST_SETTINGS.showLoadingIndicators).toBe(true)
      expect(typeof DEFAULT_MANIFEST_SETTINGS.showLoadingIndicators).toBe('boolean')
    })

    it('has exactly 4 properties', () => {
      expect(Object.keys(DEFAULT_MANIFEST_SETTINGS)).toHaveLength(4)
    })

    it('contains only the expected keys', () => {
      const expectedKeys = ['enableHotReload', 'loadTimeout', 'pluginsPath', 'showLoadingIndicators']
      const actualKeys = Object.keys(DEFAULT_MANIFEST_SETTINGS)
      expect(actualKeys.sort()).toEqual(expectedKeys.sort())
    })

    it('can be used to create a valid manifest settings object', () => {
      const manifest = {
        version: '1.0.0',
        plugins: [],
        settings: DEFAULT_MANIFEST_SETTINGS,
      }

      const result = PluginManifestSchema.safeParse(manifest)
      expect(result.success).toBe(true)
    })

    it('can be spread into settings with overrides', () => {
      const customSettings = {
        ...DEFAULT_MANIFEST_SETTINGS,
        loadTimeout: 60000,
        navigation: {
          enabledCoreItems: ['datasources'],
        },
      }

      const manifest = {
        version: '1.0.0',
        plugins: [],
        settings: customSettings,
      }

      const result = PluginManifestSchema.safeParse(manifest)
      expect(result.success).toBe(true)
    })
  })

  describe('PluginMountPointSchema', () => {
    it('accepts a minimal mount point', () => {
      const result = PluginMountPointSchema.safeParse({
        id: 'my-report',
        surface: 'datasource-sidebar',
        name: 'My Report',
      })
      expect(result.success).toBe(true)
    })

    it('accepts every documented optional field', () => {
      const result = PluginMountPointSchema.safeParse({
        id: 'audit',
        surface: 'admin-tabs',
        name: 'Audit',
        icon: 'mdi-shield',
        path: 'audit',
        group: 'Custom',
        hint: 'Recent admin actions',
        order: 50,
        insertBefore: 'person',
        insertAfter: 'datadensity',
        requiredPermissions: ['admin:security'],
        visible: true,
      })
      expect(result.success).toBe(true)
    })

    it('rejects an unknown surface', () => {
      const result = PluginMountPointSchema.safeParse({
        id: 'x',
        surface: 'nowhere',
        name: 'X',
      })
      expect(result.success).toBe(false)
    })

    it('rejects an id with invalid characters', () => {
      const result = PluginMountPointSchema.safeParse({
        id: 'My Report!',
        surface: 'analysis-tabs',
        name: 'X',
      })
      expect(result.success).toBe(false)
    })

    it('rejects surface "main-nav" (top-level nav must go through menuItems, which are route-validated)', () => {
      const result = PluginMountPointSchema.safeParse({
        id: 'sneaky',
        surface: 'main-nav',
        name: 'Sneaky',
        path: 'somewhere',
      })
      expect(result.success).toBe(false)
    })

    it('rejects a path with a leading slash', () => {
      const result = PluginMountPointSchema.safeParse({
        id: 'x',
        surface: 'account-menu',
        name: 'X',
        path: '/profile',
      })
      expect(result.success).toBe(false)
    })

    it('rejects a path containing a ".." segment', () => {
      const result = PluginMountPointSchema.safeParse({
        id: 'x',
        surface: 'account-menu',
        name: 'X',
        path: '../../admin',
      })
      expect(result.success).toBe(false)
    })

    it('rejects a path with a URL scheme', () => {
      const result = PluginMountPointSchema.safeParse({
        id: 'x',
        surface: 'account-menu',
        name: 'X',
        path: 'https://evil.example.com',
      })
      expect(result.success).toBe(false)
    })

    it('accepts a plain relative path', () => {
      const result = PluginMountPointSchema.safeParse({
        id: 'x',
        surface: 'account-menu',
        name: 'X',
        path: 'settings/profile',
      })
      expect(result.success).toBe(true)
    })

    it('allows a registration with no mountPoints', () => {
      const result = PluginRegistrationSchema.safeParse({
        id: 'p1',
        name: 'P1',
        version: '1.0.0',
        entryPoint: 'p1/index.system.js',
        menuItems: [],
      })
      expect(result.success).toBe(true)
    })

    it('parses mountPoints on a registration', () => {
      const result = PluginRegistrationSchema.safeParse({
        id: 'p1',
        name: 'P1',
        version: '1.0.0',
        entryPoint: 'p1/index.system.js',
        menuItems: [],
        mountPoints: [{ id: 'a', surface: 'account-menu', name: 'A', path: 'a' }],
      })
      expect(result.success).toBe(true)
    })
  })

  describe('schema integration tests', () => {
    it('validates complex real-world manifest', () => {
      const manifest: PluginManifest = {
        version: '3.0.0',
        plugins: [
          {
            id: 'data-quality-plugin',
            name: 'Data Quality Dashboard',
            version: '1.2.3',
            entryPoint: '/plugins/data-quality/dist/main.js',
            menuItems: [
              {
                id: 'dq-dashboard',
                name: 'Quality Dashboard',
                route: '/plugins/data-quality/dashboard',
                icon: 'mdi-chart-line',
                order: 100,
                visible: true,
              },
              {
                id: 'dq-reports',
                name: 'Quality Reports',
                route: '/plugins/data-quality/reports',
                icon: 'mdi-file-document',
                order: 101,
                parentId: 'dq-dashboard',
                badge: {
                  content: 3,
                  color: 'error',
                },
              },
            ],
            activationConditions: {
              requiredVersion: '>=3.0.0',
              features: ['data-quality', 'advanced-analytics'],
            },
            metadata: {
              author: 'OHDSI Community',
              description: 'Comprehensive data quality monitoring and reporting',
              homepage: 'https://github.com/ohdsi/data-quality-plugin',
              icon: 'mdi-shield-check',
            },
          },
          {
            id: 'cohort-explorer',
            name: 'Cohort Explorer',
            version: '2.0.0',
            entryPoint: '/plugins/cohort-explorer/main.js',
            menuItems: [
              {
                id: 'explorer',
                name: 'Explorer',
                route: '/plugins/cohort-explorer',
                icon: 'mdi-magnify',
              },
            ],
          },
        ],
        settings: {
          enableHotReload: false,
          loadTimeout: 45000,
          pluginsPath: '/custom/plugins',
          showLoadingIndicators: true,
          navigation: {
            enabledCoreItems: ['datasources', 'concepts', 'cohorts', 'reports'],
            disabledCoreItems: ['characterizations'],
          },
          theme: {
            primaryColor: '#1976D2',
            logoUrl: 'https://cdn.example.com/logo.svg',
          },
        },
      }

      const result = PluginManifestSchema.safeParse(manifest)
      expect(result.success).toBe(true)
    })

    it('provides detailed error information for invalid manifest', () => {
      const manifest = {
        version: '1.0.0',
        plugins: [
          {
            id: 'Invalid ID!', // contains invalid characters
            name: '',  // empty name
            version: '1.0.0',
            entryPoint: '/test.js',
            menuItems: [
              {
                id: 'menu',
                name: 'Menu',
                // missing route
              },
            ],
            metadata: {
              homepage: 'not-a-url', // invalid URL
            },
          },
        ],
        settings: {
          theme: {
            primaryColor: '#zzz', // invalid hex color
          },
        },
      }

      const result = PluginManifestSchema.safeParse(manifest)
      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected safeParse to fail for an invalid manifest')
      } else {
        expect(result.error.issues.length).toBeGreaterThan(0)
        // Check that errors are reported for nested fields
        const errorPaths = result.error.issues.map(issue => issue.path.join('.'))
        expect(errorPaths.some(path => path.includes('plugins'))).toBe(true)
      }
    })
  })
})
