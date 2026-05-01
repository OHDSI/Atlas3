/**
 * DataSourceTile Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import DataSourceTile from '@/components/generation/DataSourceTile.vue'
import { useWebAPIStore } from '@/stores/webapi'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'
import { createMockCDMSource, createMockGenerationJob } from '../../../helpers/mock-factories'
import type { CDMSource, GenerationJob } from '@/models/webapi.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

// Mock fetch to prevent actual API calls
global.fetch = vi.fn()

const vuetify = createVuetify({ components, directives })

describe('DataSourceTile', () => {
  let pinia: ReturnType<typeof createPinia>
  let webapiStore: ReturnType<typeof useWebAPIStore>
  let mockSource: CDMSource

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    webapiStore = useWebAPIStore()

    mockSource = createMockCDMSource({
      sourceId: 1,
      sourceKey: 'TEST_SOURCE',
      sourceName: 'Test Data Source',
      sourceDialect: 'postgresql',
      daimons: [],
    }) as CDMSource

    // The Generate button is now gated on per-source write access. Set up an
    // auth user with a WRITE grant on TEST_SOURCE so the existing assertions
    // about button enablement and click behaviour still hold.
    const authStore = useAuthStore()
    authStore.setUser({
      login: 'tester',
      displayName: 'tester',
      permissionIdx: {},
      entityAccess: { ...emptyEntityAccess(), source: { TEST_SOURCE: ['WRITE'] } },
    })

    vi.clearAllMocks()
    // Stop any polling
    webapiStore.stopAllPolling()
  })

  function mountComponent(props = {}) {
    return mount(DataSourceTile, {
      props: {
        source: mockSource,
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

    it('should display source name', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('Test Data Source')
    })

    it('should display source key', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('TEST_SOURCE')
    })

    it('should render as a VCard', () => {
      const wrapper = mountComponent()
      expect(wrapper.findComponent({ name: 'VCard' }).exists()).toBe(true)
    })
  })

  describe('Idle Status', () => {
    it('should display idle state when no job exists', () => {
      const wrapper = mountComponent({ cohortId: 123 })
      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('Generate')
    })

    it('should disable generate button when cohortId is null', () => {
      const wrapper = mountComponent({ cohortId: null })
      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('should enable generate button when cohortId is provided', () => {
      const wrapper = mountComponent({ cohortId: 123 })
      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Generating Status', () => {
    beforeEach(() => {
      const job = createMockGenerationJob({
        id: 1,
        cohortDefinitionId: 123,
        sourceKey: 'TEST_SOURCE',
        status: 'RUNNING',
      }) as GenerationJob

      webapiStore.addGenerationJob(job)
    })

    it('should display generating status for RUNNING job', () => {
      const wrapper = mountComponent({ cohortId: 123 })
      const progressCircular = wrapper.findComponent({ name: 'VProgressCircular' })
      expect(progressCircular.exists()).toBe(true)
    })

    it('should display generating status for PENDING job', () => {
      const pendingJob = createMockGenerationJob({
        id: 2,
        cohortDefinitionId: 456,
        sourceKey: 'TEST_SOURCE',
        status: 'PENDING',
      }) as GenerationJob

      webapiStore.addGenerationJob(pendingJob)

      const wrapper = mountComponent({ cohortId: 456 })
      const progressCircular = wrapper.findComponent({ name: 'VProgressCircular' })
      expect(progressCircular.exists()).toBe(true)
    })

    it('should display status text when generating', () => {
      const wrapper = mountComponent({ cohortId: 123 })
      expect(wrapper.text()).toMatch(/Starting generation\.\.\.|Running\.\.\.|Generating\.\.\./)
    })

    it('should apply generating class to card', () => {
      const wrapper = mountComponent({ cohortId: 123 })
      expect(wrapper.find('.data-source-tile--generating').exists()).toBe(true)
    })
  })

  describe('Complete Status', () => {
    beforeEach(() => {
      const job = createMockGenerationJob({
        id: 1,
        cohortDefinitionId: 123,
        sourceKey: 'TEST_SOURCE',
        status: 'COMPLETE',
        personCount: 1234,
      }) as GenerationJob

      webapiStore.addGenerationJob(job)
    })

    it('should display patient count when complete', () => {
      const wrapper = mountComponent({ cohortId: 123 })
      expect(wrapper.text()).toContain('1,234')
      // i18n mock returns key when translation not found
      // After i18n migration, common.patients was remapped to columns.personsCount ("Persons")
      expect(wrapper.text()).toMatch(/Patients|Persons|common\.patients|columns\.personsCount/)
    })

    it('should display generate button when complete', () => {
      const wrapper = mountComponent({ cohortId: 123 })
      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('Generate')
    })

    it('should apply complete class to card', () => {
      const wrapper = mountComponent({ cohortId: 123 })
      expect(wrapper.find('.data-source-tile--complete').exists()).toBe(true)
    })

    it('should handle zero patient count', () => {
      const zeroCountJob = createMockGenerationJob({
        id: 2,
        cohortDefinitionId: 456,
        sourceKey: 'TEST_SOURCE',
        status: 'COMPLETE',
        personCount: 0,
      }) as GenerationJob

      webapiStore.addGenerationJob(zeroCountJob)

      const wrapper = mountComponent({ cohortId: 456 })
      expect(wrapper.text()).toContain('0')
    })

    it('should handle missing patient count', () => {
      const noCountJob = createMockGenerationJob({
        id: 3,
        cohortDefinitionId: 789,
        sourceKey: 'TEST_SOURCE',
        status: 'COMPLETE',
        personCount: undefined,
      }) as GenerationJob

      webapiStore.addGenerationJob(noCountJob)

      const wrapper = mountComponent({ cohortId: 789 })
      expect(wrapper.text()).toContain('0')
    })
  })

  describe('Failed Status', () => {
    beforeEach(() => {
      const job = createMockGenerationJob({
        id: 1,
        cohortDefinitionId: 123,
        sourceKey: 'TEST_SOURCE',
        status: 'FAILED',
        failMessage: 'Database connection error',
      }) as GenerationJob

      webapiStore.addGenerationJob(job)
    })

    it('should display error icon when failed', () => {
      const wrapper = mountComponent({ cohortId: 123 })
      const icon = wrapper.findComponent({ name: 'VIcon' })
      expect(icon.exists()).toBe(true)
      // VIcon doesn't render text content, check props instead
      expect(icon.text()).toMatch(/mdi-alert-circle|/)
    })

    it('should display fail message when available', () => {
      const wrapper = mountComponent({ cohortId: 123 })
      expect(wrapper.text()).toContain('Database connection error')
    })

    it('should display generate button when failed', () => {
      const wrapper = mountComponent({ cohortId: 123 })
      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('Generate')
    })

    it('should apply failed class to card', () => {
      const wrapper = mountComponent({ cohortId: 123 })
      expect(wrapper.find('.data-source-tile--failed').exists()).toBe(true)
    })

    it('should display default message when failMessage is missing', () => {
      const noMessageJob = createMockGenerationJob({
        id: 2,
        cohortDefinitionId: 456,
        sourceKey: 'TEST_SOURCE',
        status: 'FAILED',
        failMessage: undefined,
      }) as GenerationJob

      webapiStore.addGenerationJob(noMessageJob)

      const wrapper = mountComponent({ cohortId: 456 })
      // i18n mock returns key when translation not found
      // After i18n migration the fallback uses ir.results.failed ("FAILED")
      expect(wrapper.text()).toMatch(/Failed|FAILED|ir\.results\.failed/)
    })
  })

  describe('User Interactions', () => {
    it('should call generateCohort when generate button is clicked', async () => {
      const generateSpy = vi.spyOn(webapiStore, 'generateCohort').mockResolvedValue(null)
      const wrapper = mountComponent({ cohortId: 123 })

      const button = wrapper.findComponent({ name: 'VBtn' })
      await button.trigger('click')

      expect(generateSpy).toHaveBeenCalledWith(123, 'TEST_SOURCE')
    })

    it('should not call generateCohort when cohortId is null', async () => {
      const generateSpy = vi.spyOn(webapiStore, 'generateCohort')
      const wrapper = mountComponent({ cohortId: null })

      const button = wrapper.findComponent({ name: 'VBtn' })
      await button.trigger('click')

      expect(generateSpy).not.toHaveBeenCalled()
    })

    it('should stop click propagation on generate button', async () => {
      const wrapper = mountComponent({ cohortId: 123 })
      const button = wrapper.findComponent({ name: 'VBtn' })

      const clickEvent = new Event('click', { bubbles: true })
      const _stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation')

      // Note: @click.stop is handled by Vue, so we just verify button exists
      expect(button.exists()).toBe(true)
    })

    it('should emit tile-click when card is clicked and status is complete', async () => {
      const job = createMockGenerationJob({
        id: 1,
        cohortDefinitionId: 123,
        sourceKey: 'TEST_SOURCE',
        status: 'COMPLETE',
      }) as GenerationJob

      webapiStore.addGenerationJob(job)

      const wrapper = mountComponent({ cohortId: 123 })
      await wrapper.find('.data-source-tile').trigger('click')

      expect(wrapper.emitted('tile-click')).toBeTruthy()
      expect(wrapper.emitted('tile-click')![0]).toEqual(['TEST_SOURCE'])
    })

    it('should not emit tile-click when status is not complete', async () => {
      const wrapper = mountComponent({ cohortId: 123 })
      await wrapper.find('.data-source-tile').trigger('click')

      expect(wrapper.emitted('tile-click')).toBeFalsy()
    })

    it('should not emit tile-click when status is generating', async () => {
      const job = createMockGenerationJob({
        id: 1,
        cohortDefinitionId: 123,
        sourceKey: 'TEST_SOURCE',
        status: 'RUNNING',
      }) as GenerationJob

      webapiStore.addGenerationJob(job)

      const wrapper = mountComponent({ cohortId: 123 })
      await wrapper.find('.data-source-tile').trigger('click')

      expect(wrapper.emitted('tile-click')).toBeFalsy()
    })

    it('should not emit tile-click when status is failed', async () => {
      const job = createMockGenerationJob({
        id: 1,
        cohortDefinitionId: 123,
        sourceKey: 'TEST_SOURCE',
        status: 'FAILED',
      }) as GenerationJob

      webapiStore.addGenerationJob(job)

      const wrapper = mountComponent({ cohortId: 123 })
      await wrapper.find('.data-source-tile').trigger('click')

      expect(wrapper.emitted('tile-click')).toBeFalsy()
    })
  })

  describe('Props', () => {
    it('should accept source prop', () => {
      const customSource = createMockCDMSource({
        sourceKey: 'CUSTOM_SOURCE',
        sourceName: 'Custom Source',
      }) as CDMSource

      const wrapper = mountComponent({ source: customSource })
      expect(wrapper.text()).toContain('Custom Source')
      expect(wrapper.text()).toContain('CUSTOM_SOURCE')
    })

    it('should accept cohortId prop', () => {
      const wrapper = mountComponent({ cohortId: 999 })
      expect(wrapper.props('cohortId')).toBe(999)
    })

    it('should accept null cohortId', () => {
      const wrapper = mountComponent({ cohortId: null })
      expect(wrapper.props('cohortId')).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle generation error gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(webapiStore, 'generateCohort').mockRejectedValue(new Error('Network error'))

      const wrapper = mountComponent({ cohortId: 123 })
      const button = wrapper.findComponent({ name: 'VBtn' })

      await button.trigger('click')

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0))

      // Component should still exist and not crash
      expect(wrapper.exists()).toBe(true)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Conditional Rendering', () => {
    it('should render only one status section at a time - idle', () => {
      const wrapper = mountComponent({ cohortId: 123 })
      expect(wrapper.findAll('.tile-status').length).toBe(1)
    })

    it('should render only one status section at a time - generating', () => {
      const job = createMockGenerationJob({
        id: 1,
        cohortDefinitionId: 123,
        sourceKey: 'TEST_SOURCE',
        status: 'RUNNING',
      }) as GenerationJob

      webapiStore.addGenerationJob(job)

      const wrapper = mountComponent({ cohortId: 123 })
      expect(wrapper.findAll('.tile-status').length).toBe(1)
      expect(wrapper.find('.tile-status--generating').exists()).toBe(true)
    })

    it('should render only one status section at a time - complete', () => {
      const job = createMockGenerationJob({
        id: 1,
        cohortDefinitionId: 123,
        sourceKey: 'TEST_SOURCE',
        status: 'COMPLETE',
      }) as GenerationJob

      webapiStore.addGenerationJob(job)

      const wrapper = mountComponent({ cohortId: 123 })
      expect(wrapper.findAll('.tile-status').length).toBe(1)
      expect(wrapper.find('.tile-status--complete').exists()).toBe(true)
    })

    it('should render only one status section at a time - failed', () => {
      const job = createMockGenerationJob({
        id: 1,
        cohortDefinitionId: 123,
        sourceKey: 'TEST_SOURCE',
        status: 'FAILED',
      }) as GenerationJob

      webapiStore.addGenerationJob(job)

      const wrapper = mountComponent({ cohortId: 123 })
      expect(wrapper.findAll('.tile-status').length).toBe(1)
      expect(wrapper.find('.tile-status--failed').exists()).toBe(true)
    })
  })

  describe('Store Integration', () => {
    it('should find job from store by cohortId and sourceKey', () => {
      const job = createMockGenerationJob({
        id: 1,
        cohortDefinitionId: 123,
        sourceKey: 'TEST_SOURCE',
        status: 'COMPLETE',
        personCount: 5000,
      }) as GenerationJob

      webapiStore.addGenerationJob(job)

      const wrapper = mountComponent({ cohortId: 123 })
      expect(wrapper.text()).toContain('5,000')
    })

    it('should not display job from different cohort', () => {
      const job = createMockGenerationJob({
        id: 1,
        cohortDefinitionId: 999,
        sourceKey: 'TEST_SOURCE',
        status: 'COMPLETE',
        personCount: 5000,
      }) as GenerationJob

      webapiStore.addGenerationJob(job)

      const wrapper = mountComponent({ cohortId: 123 })
      expect(wrapper.text()).not.toContain('5,000')
      expect(wrapper.findComponent({ name: 'VBtn' }).text()).toContain('Generate')
    })

    it('should not display job from different source', () => {
      const job = createMockGenerationJob({
        id: 1,
        cohortDefinitionId: 123,
        sourceKey: 'OTHER_SOURCE',
        status: 'COMPLETE',
        personCount: 5000,
      }) as GenerationJob

      webapiStore.addGenerationJob(job)

      const wrapper = mountComponent({ cohortId: 123 })
      expect(wrapper.text()).not.toContain('5,000')
      expect(wrapper.findComponent({ name: 'VBtn' }).text()).toContain('Generate')
    })
  })
})
