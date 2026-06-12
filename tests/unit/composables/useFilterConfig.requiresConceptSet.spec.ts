/**
 * Issue #98 — Observation Period (and other period-style criteria with no
 * event-level concept_id) must NOT offer a concept-set selector.
 *
 * This drives `requiresConceptSet` from the *real* atlas-config.json via the
 * config-loader service (no mocks), so it verifies the actual shipped config
 * rather than a fixture.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useFilterConfig } from '@/composables/useFilterConfig'
import { configLoaderService } from '@/services/config-loader.service'

describe('useFilterConfig.requiresConceptSet (real config, issue #98)', () => {
  beforeAll(async () => {
    await configLoaderService.loadConfiguration()
  })

  beforeEach(() => {
    // useFilterConfig -> useI18n reaches into a Pinia store.
    setActivePinia(createPinia())
  })

  it('returns false for criteria types without an event-level concept set', () => {
    const { requiresConceptSet } = useFilterConfig(ref('criteriaGroup'))
    // OMOP observation_period / payer_plan_period have no concept_id.
    expect(requiresConceptSet('observationPeriod')).toBe(false)
    expect(requiresConceptSet('payerPlanPeriod')).toBe(false)
    // Demographic was already false before this change.
    expect(requiresConceptSet('demographic')).toBe(false)
  })

  it('returns true for criteria types that reference a concept set', () => {
    const { requiresConceptSet } = useFilterConfig(ref('initialEvents'))
    expect(requiresConceptSet('conditionOccurrence')).toBe(true)
    expect(requiresConceptSet('drugExposure')).toBe(true)
    // Location/Region uses a CodesetId for the geography concept set.
    expect(requiresConceptSet('locationRegion')).toBe(true)
  })
})
