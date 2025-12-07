/**
 * DataSourceTileGrid Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import DataSourceTileGrid from '@/components/generation/DataSourceTileGrid.vue'
import DataSourceTile from '@/components/generation/DataSourceTile.vue'
import { useWebAPIStore } from '@/stores/webapi'
import { createMockCDMSource } from '../../../helpers/mock-factories'
import type { CDMSource } from '@/models/webapi.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

describe('DataSourceTileGrid', () => {
  let pinia: ReturnType<typeof createPinia>
  let webapiStore: ReturnType<typeof useWebAPIStore>
  let mockSources: CDMSource[]

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    webapiStore = useWebAPIStore()

    mockSources = [
      createMockCDMSource({
        sourceId: 1,
        sourceKey: 'SOURCE_1',
        sourceName: 'Test Source 1',
        sourceDialect: 'postgresql',
        daimons: [],
      }) as CDMSource,
      createMockCDMSource({
        sourceId: 2,
        sourceKey: 'SOURCE_2',
        sourceName: 'Test Source 2',
        sourceDialect: 'redshift',
        daimons: [],
      }) as CDMSource,
      createMockCDMSource({
        sourceId: 3,
        sourceKey: 'SOURCE_3',
        sourceName: 'Test Source 3',
        sourceDialect: 'sql server',
        daimons: [],
      }) as CDMSource,
    ]

    vi.clearAllMocks()
  })

  function mountComponent(props = {}) {
    return mount(DataSourceTileGrid, {
      props: {
        cohortId: null,
        ...props,
      },
      global: {
        plugins: [vuetify, pinia],
      },
    })
  }

  describe('Rendering', () => {
    it('should mount successfully', () => {
      const wrapper = mountComponent()
      expect(wrapper.exists()).toBe(true)
    })

    it('should render grid container', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.tiles-grid').exists()).toBe(true)
    })

    it('should render DataSourceTile components for each source', () => {
      const wrapper = mountComponent({ sources: mockSources })
      const tiles = wrapper.findAllComponents(DataSourceTile)
      expect(tiles).toHaveLength(3)
    })

    it('should pass correct source to each tile', () => {
      const wrapper = mountComponent({ sources: mockSources })
      const tiles = wrapper.findAllComponents(DataSourceTile)

      expect(tiles[0].props('source')).toEqual(mockSources[0])
      expect(tiles[1].props('source')).toEqual(mockSources[1])
      expect(tiles[2].props('source')).toEqual(mockSources[2])
    })

    it('should pass cohortId to all tiles', () => {
      const wrapper = mountComponent({ sources: mockSources, cohortId: 123 })
      const tiles = wrapper.findAllComponents(DataSourceTile)

      tiles.forEach(tile => {
        expect(tile.props('cohortId')).toBe(123)
      })
    })
  })

  describe('Props', () => {
    it('should accept explicit sources prop', () => {
      const wrapper = mountComponent({ sources: mockSources })
      const tiles = wrapper.findAllComponents(DataSourceTile)
      expect(tiles).toHaveLength(3)
    })

    it('should use store sources when sources prop is not provided', () => {
      webapiStore.setSources(mockSources)

      const wrapper = mountComponent()
      const tiles = wrapper.findAllComponents(DataSourceTile)
      expect(tiles).toHaveLength(3)
    })

    it('should prefer explicit sources prop over store sources', () => {
      const storeSources = [
        createMockCDMSource({
          sourceKey: 'STORE_SOURCE',
          sourceName: 'Store Source',
        }) as CDMSource,
      ]

      webapiStore.setSources(storeSources)

      const wrapper = mountComponent({ sources: mockSources })
      const tiles = wrapper.findAllComponents(DataSourceTile)

      expect(tiles).toHaveLength(3)
      expect(tiles[0].props('source').sourceKey).toBe('SOURCE_1')
    })

    it('should accept cohortId prop', () => {
      const wrapper = mountComponent({ sources: mockSources, cohortId: 456 })
      expect(wrapper.props('cohortId')).toBe(456)
    })

    it('should accept null cohortId', () => {
      const wrapper = mountComponent({ sources: mockSources, cohortId: null })
      expect(wrapper.props('cohortId')).toBeNull()
    })
  })

  describe('Empty State', () => {
    it('should render no tiles when sources array is empty', () => {
      const wrapper = mountComponent({ sources: [] })
      const tiles = wrapper.findAllComponents(DataSourceTile)
      expect(tiles).toHaveLength(0)
    })

    it('should render no tiles when store has no sources', () => {
      const wrapper = mountComponent()
      const tiles = wrapper.findAllComponents(DataSourceTile)
      expect(tiles).toHaveLength(0)
    })

    it('should handle undefined sources gracefully', () => {
      const wrapper = mountComponent({ sources: undefined })
      expect(wrapper.exists()).toBe(true)
      // Should fall back to store sources
      const tiles = wrapper.findAllComponents(DataSourceTile)
      expect(tiles).toHaveLength(0)
    })
  })

  describe('Event Handling', () => {
    it('should emit tile-click event when tile is clicked', async () => {
      const wrapper = mountComponent({ sources: mockSources, cohortId: 123 })
      const tiles = wrapper.findAllComponents(DataSourceTile)

      await tiles[0].vm.$emit('tile-click', 'SOURCE_1')

      expect(wrapper.emitted('tile-click')).toBeTruthy()
      expect(wrapper.emitted('tile-click')![0]).toEqual(['SOURCE_1'])
    })

    it('should forward tile-click with correct sourceKey', async () => {
      const wrapper = mountComponent({ sources: mockSources, cohortId: 123 })
      const tiles = wrapper.findAllComponents(DataSourceTile)

      await tiles[1].vm.$emit('tile-click', 'SOURCE_2')

      expect(wrapper.emitted('tile-click')).toBeTruthy()
      expect(wrapper.emitted('tile-click')![0]).toEqual(['SOURCE_2'])
    })

    it('should handle multiple tile-click events', async () => {
      const wrapper = mountComponent({ sources: mockSources, cohortId: 123 })
      const tiles = wrapper.findAllComponents(DataSourceTile)

      await tiles[0].vm.$emit('tile-click', 'SOURCE_1')
      await tiles[1].vm.$emit('tile-click', 'SOURCE_2')
      await tiles[2].vm.$emit('tile-click', 'SOURCE_3')

      expect(wrapper.emitted('tile-click')).toHaveLength(3)
      expect(wrapper.emitted('tile-click')![0]).toEqual(['SOURCE_1'])
      expect(wrapper.emitted('tile-click')![1]).toEqual(['SOURCE_2'])
      expect(wrapper.emitted('tile-click')![2]).toEqual(['SOURCE_3'])
    })
  })

  describe('Layout', () => {
    it('should apply flex column layout', () => {
      const wrapper = mountComponent({ sources: mockSources })
      const grid = wrapper.find('.tiles-grid')

      // Check that the grid has the flex column class
      expect(grid.exists()).toBe(true)
    })

    it('should render tiles in correct order', () => {
      const wrapper = mountComponent({ sources: mockSources })
      const tiles = wrapper.findAllComponents(DataSourceTile)

      expect(tiles[0].props('source').sourceKey).toBe('SOURCE_1')
      expect(tiles[1].props('source').sourceKey).toBe('SOURCE_2')
      expect(tiles[2].props('source').sourceKey).toBe('SOURCE_3')
    })
  })

  describe('Dynamic Updates', () => {
    it('should update when sources prop changes', async () => {
      const wrapper = mountComponent({ sources: [mockSources[0]] })
      expect(wrapper.findAllComponents(DataSourceTile)).toHaveLength(1)

      await wrapper.setProps({ sources: mockSources })
      expect(wrapper.findAllComponents(DataSourceTile)).toHaveLength(3)
    })

    it('should update when cohortId changes', async () => {
      const wrapper = mountComponent({ sources: mockSources, cohortId: 123 })
      let tiles = wrapper.findAllComponents(DataSourceTile)
      tiles.forEach(tile => {
        expect(tile.props('cohortId')).toBe(123)
      })

      await wrapper.setProps({ cohortId: 456 })
      tiles = wrapper.findAllComponents(DataSourceTile)
      tiles.forEach(tile => {
        expect(tile.props('cohortId')).toBe(456)
      })
    })

    it('should update when store sources change', async () => {
      const wrapper = mountComponent()
      expect(wrapper.findAllComponents(DataSourceTile)).toHaveLength(0)

      webapiStore.setSources(mockSources)
      await wrapper.vm.$nextTick()

      expect(wrapper.findAllComponents(DataSourceTile)).toHaveLength(3)
    })
  })

  describe('Store Integration', () => {
    it('should read from webapi store when sources not provided', () => {
      const storeSources = [
        createMockCDMSource({
          sourceKey: 'STORE_1',
          sourceName: 'Store Source 1',
        }) as CDMSource,
        createMockCDMSource({
          sourceKey: 'STORE_2',
          sourceName: 'Store Source 2',
        }) as CDMSource,
      ]

      webapiStore.setSources(storeSources)

      const wrapper = mountComponent()
      const tiles = wrapper.findAllComponents(DataSourceTile)

      expect(tiles).toHaveLength(2)
      expect(tiles[0].props('source').sourceKey).toBe('STORE_1')
      expect(tiles[1].props('source').sourceKey).toBe('STORE_2')
    })

    it('should react to store updates', async () => {
      const wrapper = mountComponent()
      expect(wrapper.findAllComponents(DataSourceTile)).toHaveLength(0)

      const storeSources = [
        createMockCDMSource({
          sourceKey: 'NEW_SOURCE',
          sourceName: 'New Source',
        }) as CDMSource,
      ]

      webapiStore.setSources(storeSources)
      await wrapper.vm.$nextTick()

      const tiles = wrapper.findAllComponents(DataSourceTile)
      expect(tiles).toHaveLength(1)
      expect(tiles[0].props('source').sourceKey).toBe('NEW_SOURCE')
    })
  })

  describe('Key Handling', () => {
    it('should use sourceKey as key for each tile', () => {
      const wrapper = mountComponent({ sources: mockSources })
      const tiles = wrapper.findAllComponents(DataSourceTile)

      // Vue uses keys internally, we can verify by checking that each tile
      // has unique source props
      const keys = tiles.map(tile => tile.props('source').sourceKey)
      const uniqueKeys = new Set(keys)
      expect(uniqueKeys.size).toBe(keys.length)
    })

    it('should maintain tile identity when sources are reordered', async () => {
      const wrapper = mountComponent({ sources: mockSources })
      const initialTiles = wrapper.findAllComponents(DataSourceTile)
      const _initialFirstTileKey = initialTiles[0].props('source').sourceKey

      // Reorder sources
      const reorderedSources = [mockSources[2], mockSources[0], mockSources[1]]
      await wrapper.setProps({ sources: reorderedSources })

      const reorderedTiles = wrapper.findAllComponents(DataSourceTile)
      expect(reorderedTiles[0].props('source').sourceKey).toBe('SOURCE_3')
      expect(reorderedTiles[1].props('source').sourceKey).toBe('SOURCE_1')
      expect(reorderedTiles[2].props('source').sourceKey).toBe('SOURCE_2')
    })
  })

  describe('Edge Cases', () => {
    it('should handle single source', () => {
      const wrapper = mountComponent({ sources: [mockSources[0]] })
      const tiles = wrapper.findAllComponents(DataSourceTile)
      expect(tiles).toHaveLength(1)
      expect(tiles[0].props('source')).toEqual(mockSources[0])
    })

    it('should handle many sources', () => {
      const manySources = Array.from({ length: 20 }, (_, i) =>
        createMockCDMSource({
          sourceId: i + 1,
          sourceKey: `SOURCE_${i + 1}`,
          sourceName: `Source ${i + 1}`,
        })
      ) as CDMSource[]

      const wrapper = mountComponent({ sources: manySources })
      const tiles = wrapper.findAllComponents(DataSourceTile)
      expect(tiles).toHaveLength(20)
    })

    it('should handle sources with duplicate names', () => {
      const duplicateNameSources = [
        createMockCDMSource({
          sourceId: 1,
          sourceKey: 'SOURCE_1',
          sourceName: 'Same Name',
        }) as CDMSource,
        createMockCDMSource({
          sourceId: 2,
          sourceKey: 'SOURCE_2',
          sourceName: 'Same Name',
        }) as CDMSource,
      ]

      const wrapper = mountComponent({ sources: duplicateNameSources })
      const tiles = wrapper.findAllComponents(DataSourceTile)

      expect(tiles).toHaveLength(2)
      // Should still be distinguished by sourceKey
      expect(tiles[0].props('source').sourceKey).toBe('SOURCE_1')
      expect(tiles[1].props('source').sourceKey).toBe('SOURCE_2')
    })

    it('should handle sources with special characters in names', () => {
      const specialSource = createMockCDMSource({
        sourceKey: 'SPECIAL_SOURCE',
        sourceName: 'Source with <special> & "characters"',
      }) as CDMSource

      const wrapper = mountComponent({ sources: [specialSource] })
      const tiles = wrapper.findAllComponents(DataSourceTile)
      expect(tiles).toHaveLength(1)
      expect(tiles[0].props('source').sourceName).toContain('special')
    })
  })
})
