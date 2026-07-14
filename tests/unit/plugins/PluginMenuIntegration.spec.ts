/**
 * Plugin Menu Integration Tests
 * Tests for plugin menu item generation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generatePluginMenuItems,
  shouldUseVirtualScrolling,
  getMenuItemsForPlugin,
  interleaveMenuItems,
  type PluginMenuItem
} from '@/plugins/navigation/PluginMenuIntegration'
import { pluginRegistry } from '@/plugins/core/PluginRegistry'

vi.mock('@/plugins/core/PluginRegistry', () => ({
  pluginRegistry: {
    getAllPlugins: vi.fn()
  }
}))

describe('PluginMenuIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generatePluginMenuItems', () => {
    it('should generate menu items from plugins', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          state: 'active',
          registration: {
            id: 'plugin1',
            menuItems: [
              { id: 'item1', name: 'Item 1', route: '/plugins/plugin1/item1', order: 1, visible: true }
            ]
          }
        }
      ] as any)

      const items = generatePluginMenuItems()

      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('plugin1-item1')
      expect(items[0].pluginId).toBe('plugin1')
      expect(items[0].name).toBe('Item 1')
    })

    it('should skip plugins in error state', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          state: 'error',
          registration: {
            id: 'errorPlugin',
            menuItems: [
              { id: 'item1', name: 'Item 1', route: '/plugins/errorPlugin/item1' }
            ]
          }
        },
        {
          state: 'active',
          registration: {
            id: 'activePlugin',
            menuItems: [
              { id: 'item1', name: 'Active Item', route: '/plugins/activePlugin/item1' }
            ]
          }
        }
      ] as any)

      const items = generatePluginMenuItems()

      expect(items).toHaveLength(1)
      expect(items[0].pluginId).toBe('activePlugin')
    })

    it('should sort items by order', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          state: 'active',
          registration: {
            id: 'plugin1',
            menuItems: [
              { id: 'item1', name: 'Item 1', route: '/test1', order: 10 },
              { id: 'item2', name: 'Item 2', route: '/test2', order: 1 }
            ]
          }
        }
      ] as any)

      const items = generatePluginMenuItems()

      expect(items[0].order).toBe(1)
      expect(items[1].order).toBe(10)
    })

    it('should default order to 999 if not specified', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          state: 'active',
          registration: {
            id: 'plugin1',
            menuItems: [
              { id: 'item1', name: 'Item 1', route: '/test1' }
            ]
          }
        }
      ] as any)

      const items = generatePluginMenuItems()

      expect(items[0].order).toBe(999)
    })

    it('should default visible to true if not specified', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          state: 'active',
          registration: {
            id: 'plugin1',
            menuItems: [
              { id: 'item1', name: 'Item 1', route: '/test1' }
            ]
          }
        }
      ] as any)

      const items = generatePluginMenuItems()

      expect(items[0].visible).toBe(true)
    })

    it('should include badge if provided', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          state: 'active',
          registration: {
            id: 'plugin1',
            menuItems: [
              { id: 'item1', name: 'Item 1', route: '/test1', badge: { content: '5', color: 'red' } }
            ]
          }
        }
      ] as any)

      const items = generatePluginMenuItems()

      expect(items[0].badge).toEqual({ content: '5', color: 'red' })
    })

    it('should prefix parentId with pluginId', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          state: 'active',
          registration: {
            id: 'plugin1',
            menuItems: [
              { id: 'child', name: 'Child', route: '/test1', parentId: 'parent' }
            ]
          }
        }
      ] as any)

      const items = generatePluginMenuItems()

      expect(items[0].parentId).toBe('plugin1-parent')
    })

    it('should return empty array when no plugins', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([])

      const items = generatePluginMenuItems()

      expect(items).toHaveLength(0)
    })
  })

  describe('shouldUseVirtualScrolling', () => {
    it('should return true when item count > 50', () => {
      expect(shouldUseVirtualScrolling(51)).toBe(true)
      expect(shouldUseVirtualScrolling(100)).toBe(true)
    })

    it('should return false when item count <= 50', () => {
      expect(shouldUseVirtualScrolling(50)).toBe(false)
      expect(shouldUseVirtualScrolling(25)).toBe(false)
      expect(shouldUseVirtualScrolling(0)).toBe(false)
    })
  })

  describe('getMenuItemsForPlugin', () => {
    it('should filter menu items by plugin id', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          state: 'active',
          registration: {
            id: 'plugin1',
            menuItems: [
              { id: 'item1', name: 'Plugin 1 Item', route: '/test1' }
            ]
          }
        },
        {
          state: 'active',
          registration: {
            id: 'plugin2',
            menuItems: [
              { id: 'item1', name: 'Plugin 2 Item', route: '/test2' }
            ]
          }
        }
      ] as any)

      const items = getMenuItemsForPlugin('plugin1')

      expect(items).toHaveLength(1)
      expect(items[0].pluginId).toBe('plugin1')
    })

    it('should return empty array for non-existent plugin', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([])

      const items = getMenuItemsForPlugin('nonexistent')

      expect(items).toHaveLength(0)
    })
  })
})

describe('interleaveMenuItems', () => {
  interface NavItem {
    id: string
    titleKey: string
  }

  const core: NavItem[] = [
    { id: 'datasources', titleKey: 'nav.ds' },
    { id: 'cohorts', titleKey: 'nav.co' },
  ]

  function pluginItem(id: string, extra: Partial<PluginMenuItem> = {}): PluginMenuItem {
    return {
      id,
      pluginId: 'p1',
      name: id,
      route: `/plugins/p1/${id}`,
      order: 999,
      visible: true,
      ...extra,
    }
  }

  const toItem = (p: PluginMenuItem): NavItem => ({ id: p.id, titleKey: p.name })

  it('appends unanchored items at the end', () => {
    const result = interleaveMenuItems(core, [pluginItem('a')], toItem)
    expect(result.map((i) => i.id)).toEqual(['datasources', 'cohorts', 'a'])
  })

  it('inserts before the named core item', () => {
    const result = interleaveMenuItems(core, [pluginItem('a', { insertBefore: 'cohorts' })], toItem)
    expect(result.map((i) => i.id)).toEqual(['datasources', 'a', 'cohorts'])
  })

  it('inserts after the named core item', () => {
    const result = interleaveMenuItems(core, [pluginItem('a', { insertAfter: 'datasources' })], toItem)
    expect(result.map((i) => i.id)).toEqual(['datasources', 'a', 'cohorts'])
  })

  it('keeps relative order of multiple items sharing an anchor', () => {
    const result = interleaveMenuItems(
      core,
      [pluginItem('a', { insertAfter: 'datasources' }), pluginItem('b', { insertAfter: 'datasources' })],
      toItem
    )
    expect(result.map((i) => i.id)).toEqual(['datasources', 'a', 'b', 'cohorts'])
  })

  it('falls back to the end for unknown anchor targets', () => {
    const result = interleaveMenuItems(core, [pluginItem('a', { insertBefore: 'nope' })], toItem)
    expect(result.map((i) => i.id)).toEqual(['datasources', 'cohorts', 'a'])
  })

  it('prefers insertBefore when both anchors are set', () => {
    const result = interleaveMenuItems(
      core,
      [pluginItem('a', { insertBefore: 'cohorts', insertAfter: 'datasources' })],
      toItem
    )
    expect(result.map((i) => i.id)).toEqual(['datasources', 'a', 'cohorts'])
  })
})
