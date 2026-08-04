import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMountItems, mountKey } from '@/plugins/navigation/PluginMountPoints'
import { pluginRegistry } from '@/plugins/core/PluginRegistry'

vi.mock('@/plugins/core/PluginRegistry', () => ({
  pluginRegistry: { getAllPlugins: vi.fn() },
}))

function plugin(id: string, mountPoints: unknown[], state = 'mounted', menuItems: unknown[] = []) {
  return { state, registration: { id, menuItems, mountPoints } } as never
}

describe('PluginMountPoints', () => {
  beforeEach(() => vi.clearAllMocks())

  it('builds a namespaced key', () => {
    expect(mountKey('p1', 'a')).toBe('plugin:p1:a')
  })

  it('returns only items for the requested surface', () => {
    vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
      plugin('p1', [
        { id: 'a', surface: 'admin-tabs', name: 'A' },
        { id: 'b', surface: 'analysis-tabs', name: 'B' },
      ]),
    ])
    const items = getMountItems('admin-tabs')
    expect(items).toHaveLength(1)
    expect(items[0]!.itemId).toBe('a')
    expect(items[0]!.key).toBe('plugin:p1:a')
  })

  it('excludes plugins in error state', () => {
    vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
      plugin('bad', [{ id: 'a', surface: 'admin-tabs', name: 'A' }], 'error'),
    ])
    expect(getMountItems('admin-tabs')).toHaveLength(0)
  })

  it('excludes items with visible false', () => {
    vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
      plugin('p1', [{ id: 'a', surface: 'admin-tabs', name: 'A', visible: false }]),
    ])
    expect(getMountItems('admin-tabs')).toHaveLength(0)
  })

  it('keeps items whose requiredPermissions is omitted', () => {
    vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
      plugin('p1', [{ id: 'a', surface: 'admin-tabs', name: 'A' }]),
    ])
    expect(getMountItems('admin-tabs', () => false)).toHaveLength(1)
  })

  it('drops items when no required permission is held (any-of)', () => {
    vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
      plugin('p1', [
        { id: 'a', surface: 'admin-tabs', name: 'A', requiredPermissions: ['admin:security'] },
        { id: 'b', surface: 'admin-tabs', name: 'B', requiredPermissions: ['admin:cache'] },
      ]),
    ])
    const items = getMountItems('admin-tabs', perms => perms.includes('admin:cache'))
    expect(items.map(i => i.itemId)).toEqual(['b'])
  })

  it('sorts by order and defaults missing order to 999', () => {
    vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
      plugin('p1', [
        { id: 'late', surface: 'admin-tabs', name: 'Late' },
        { id: 'early', surface: 'admin-tabs', name: 'Early', order: 1 },
      ]),
    ])
    expect(getMountItems('admin-tabs').map(i => i.itemId)).toEqual(['early', 'late'])
  })

  it('normalizes legacy menuItems into the main-nav surface', () => {
    vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
      plugin('p1', [], 'mounted', [
        { id: 'legacy', name: 'Legacy', route: '/plugins/p1/legacy', order: 2 },
      ]),
    ])
    const items = getMountItems('main-nav')
    expect(items).toHaveLength(1)
    expect(items[0]!.itemId).toBe('legacy')
    expect(items[0]!.path).toBe('/plugins/p1/legacy')
  })

  it('last registration wins on a duplicate id within a surface', () => {
    vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
      plugin('p1', [
        { id: 'dup', surface: 'admin-tabs', name: 'First' },
        { id: 'dup', surface: 'admin-tabs', name: 'Second' },
      ]),
    ])
    const items = getMountItems('admin-tabs')
    expect(items).toHaveLength(1)
    expect(items[0]!.name).toBe('Second')
  })

  it('tolerates a plugin with no mountPoints field', () => {
    vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
      { state: 'mounted', registration: { id: 'p1', menuItems: [] } } as never,
    ])
    expect(getMountItems('admin-tabs')).toEqual([])
  })
})
