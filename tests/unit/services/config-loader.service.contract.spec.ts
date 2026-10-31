import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ValidationResult } from '@/models/config.types'

vi.mock('@/config/atlas-config.json', () => ({
  default: {
    criteriaTypes: {
      plain: { type: 'plain', label: 'Plain' },
      grouped: { type: 'grouped', label: 'Grouped', groupOnly: true },
      blocked: { type: 'blocked', label: 'Blocked' },
    },
    attributeMapping: {
      plain: [{ id: 'startDate', type: 'date' }],
      blocked: [{ id: 'age', type: 'numeric' }],
    },
    sections: {
      initialEvents: { label: 'Initial Events', excludeTypes: ['blocked'] },
      criteriaGroup: { label: 'Criteria Group' },
      everything: { label: 'Everything', includeAll: true },
    },
  },
}))

vi.mock('@/utils/config-validator', () => ({
  validateAtlasConfig: vi.fn(),
  formatValidationSummary: vi.fn(() => 'summary'),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { ConfigLoaderService } from '@/services/config-loader.service'
import { validateAtlasConfig } from '@/utils/config-validator'
import { logger } from '@/utils/logger'

function validation(validFilterTypes: string[], invalidFilterTypes: string[] = []): ValidationResult {
  return {
    valid: invalidFilterTypes.length === 0,
    errors: [],
    warnings: [],
    validFilterTypes,
    invalidFilterTypes,
    timestamp: new Date(),
  }
}

describe('ConfigLoaderService loading and query contract', () => {
  let service: ConfigLoaderService

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(validateAtlasConfig).mockReturnValue(validation(['plain', 'grouped', 'blocked']))
    service = new ConfigLoaderService()
  })

  it('turns a keyed sections record into an array carrying each key as id', async () => {
    await service.loadConfiguration()

    expect(service.getAllSections()).toEqual([
      { id: 'initialEvents', label: 'Initial Events', excludeTypes: ['blocked'] },
      { id: 'criteriaGroup', label: 'Criteria Group' },
      { id: 'everything', label: 'Everything', includeAll: true },
    ])
    expect(service.getSectionConfig('criteriaGroup')).toEqual({ id: 'criteriaGroup', label: 'Criteria Group' })
  })

  it('keeps no configuration when no filter type validates', async () => {
    vi.mocked(validateAtlasConfig).mockReturnValue(validation([], ['plain']))

    await service.loadConfiguration()

    expect(service.getAllSections()).toEqual([])
    expect(service.getValidFilterTypesForSection('initialEvents')).toEqual([])
  })

  it('reports a load failure as an invalid result instead of throwing', async () => {
    const boom = new Error('boom')
    vi.mocked(validateAtlasConfig).mockImplementation(() => {
      throw boom
    })

    const result = await service.loadConfiguration()

    expect(result).toEqual({
      valid: false,
      errors: [{ message: 'Failed to load configuration: boom', code: 'LOAD_FAILED', details: boom }],
      warnings: [],
      validFilterTypes: [],
      invalidFilterTypes: [],
      timestamp: expect.any(Date),
    })
    expect(service.getValidationResult()).toBe(result)
    expect(service.getValidFilterTypes()).toEqual([])
  })

  it('stringifies a non-Error load failure into the message', async () => {
    vi.mocked(validateAtlasConfig).mockImplementation(() => {
      throw 'bad json'
    })

    const result = await service.loadConfiguration()

    expect(result.errors[0]?.message).toBe('Failed to load configuration: bad json')
  })

  describe('getValidFilterTypesForSection', () => {
    beforeEach(async () => {
      await service.loadConfiguration()
    })

    it('drops types the section excludes and group-only types', () => {
      expect(service.getValidFilterTypesForSection('initialEvents')).toEqual(['plain'])
    })

    it('offers group-only types in the criteria group even without includeAll', () => {
      expect(service.getValidFilterTypesForSection('criteriaGroup')).toEqual(['plain', 'grouped', 'blocked'])
    })

    it('offers group-only types in any section that includes all', () => {
      expect(service.getValidFilterTypesForSection('everything')).toEqual(['plain', 'grouped', 'blocked'])
    })

    it('keeps a valid type that has no criteria entry', async () => {
      vi.mocked(validateAtlasConfig).mockReturnValue(validation(['plain', 'ghost']))
      await service.loadConfiguration()

      expect(service.getValidFilterTypesForSection('initialEvents')).toEqual(['plain', 'ghost'])
    })
  })

  it('returns no attributes for a filter type that failed validation', async () => {
    vi.mocked(validateAtlasConfig).mockReturnValue(validation(['plain'], ['blocked']))
    await service.loadConfiguration()

    expect(service.getAttributesForFilter('blocked', 'initialEvents')).toEqual([])
    expect(service.getAttributesForFilter('plain', 'initialEvents')).toEqual([{ id: 'startDate', type: 'date' }])
  })

  describe('reload', () => {
    const arrayConfig = {
      criteriaTypes: { other: { type: 'other', label: 'Other' } },
      attributeMapping: {},
      sections: [{ id: 'onlySection', label: 'Only' }],
    }

    beforeEach(async () => {
      await service.loadConfiguration()
    })

    it('adopts an array of sections from the new configuration and notifies subscribers', async () => {
      vi.mocked(validateAtlasConfig).mockReturnValue(validation(['other']))
      const callback = vi.fn()
      service.onConfigurationChange(callback)

      await service.reload(arrayConfig)

      expect(service.getAllSections()).toEqual([{ id: 'onlySection', label: 'Only' }])
      expect(callback).toHaveBeenCalledWith(arrayConfig)
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('converts a keyed sections record from the new configuration', async () => {
      vi.mocked(validateAtlasConfig).mockReturnValue(validation(['other']))

      await service.reload({ ...arrayConfig, sections: { keyed: { label: 'Keyed' } } })

      expect(service.getAllSections()).toEqual([{ id: 'keyed', label: 'Keyed' }])
    })

    it('keeps the previous configuration when the new one has no valid filter types', async () => {
      vi.mocked(validateAtlasConfig).mockReturnValue(validation([], ['other']))
      const callback = vi.fn()
      service.onConfigurationChange(callback)

      await service.reload(arrayConfig)

      expect(service.getSectionConfig('initialEvents')).toEqual({
        id: 'initialEvents',
        label: 'Initial Events',
        excludeTypes: ['blocked'],
      })
      expect(callback).not.toHaveBeenCalled()
    })
  })

  it('unsubscribing twice leaves other subscribers in place', async () => {
    await service.loadConfiguration()
    const removed = vi.fn()
    const kept = vi.fn()
    const unsubscribe = service.onConfigurationChange(removed)
    service.onConfigurationChange(kept)

    unsubscribe()
    unsubscribe()
    await service.reload()

    expect(removed).not.toHaveBeenCalled()
    expect(kept).toHaveBeenCalledTimes(1)
  })
})
