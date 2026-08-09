/**
 * Shape audit for everything Pythia injects.
 *
 * The agent's proposals travel translate -> cohort store -> convertInternalToAtlas,
 * and each hop has its own idea of an item's shape. Two mismatches had already
 * shipped silently: concept-set items in ATLAS shape mapped with internal-shape
 * keys (producing a concept with no CONCEPT_ID, which broke the live preview),
 * and `domain` vs `domainId` (dropping DOMAIN_ID). Neither surfaced as an error
 * — the cohort just quietly described the wrong thing.
 *
 * This walks every capability that can put criteria into a cohort and asserts
 * the ATLAS JSON that comes out the far end is actually usable.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { translateCapability } from '@/plugins/host/capabilities/translate'
import { useCohortStore } from '@/stores/cohort'
import { convertInternalToAtlas } from '@/services/atlas-converter'

const CONCEPT = {
  conceptId: 40481087,
  conceptName: 'Viral sinusitis',
  domain: 'Condition',
  includeDescendants: true,
}

function applyAndConvert(capability: string, args: Record<string, unknown>) {
  const store = useCohortStore()
  store.createNewCohort()
  const proposal = translateCapability(capability, args)
  expect(proposal, `${capability} produced no proposal`).toBeTruthy()
  store.applyProposal(proposal as never)
  return convertInternalToAtlas(store.currentCohort!) as unknown as Record<string, never>
}

function everyConcept(atlas: Record<string, never>) {
  const sets = (atlas.ConceptSets ?? []) as unknown as Array<{ expression?: { items?: Array<{ concept?: Record<string, unknown> }> } }>
  return sets.flatMap(cs => (cs.expression?.items ?? []).map(i => i.concept ?? {}))
}

describe('shapes of everything the agent injects', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const criteriaCapabilities: Array<[string, Record<string, unknown>]> = [
    ['set_entry_event', { ...CONCEPT }],
    ['add_criterion', { ...CONCEPT, group: 'inclusion' }],
    ['add_criterion', { ...CONCEPT, group: 'exclusion' }],
    ['add_inclusion_rule', { name: 'On amoxicillin', events: [{ ...CONCEPT }] }],
    ['add_criteria', { name: 'Batch', events: [{ ...CONCEPT }] }],
    ['add_exit_criterion', { strategy: 'continuous_drug', persistenceWindow: 30, concept: { ...CONCEPT } }],
    ['set_censor_event', { ...CONCEPT }],
  ]

  it.each(criteriaCapabilities)('%s produces concepts with a real CONCEPT_ID', (cap, args) => {
    const atlas = applyAndConvert(cap, args)
    const concepts = everyConcept(atlas)
    expect(concepts.length, 'no concept sets were emitted at all').toBeGreaterThan(0)
    const sets = (atlas.ConceptSets ?? []) as unknown as Array<{ expression?: { items?: unknown[] } }>
    for (const cs of sets) {
      expect(cs.expression?.items?.length, `${cap} emitted a concept set with no items`).toBeGreaterThan(0)
    }
    for (const c of concepts) {
      expect(c.CONCEPT_ID, `${cap} emitted a concept with no CONCEPT_ID`).toBe(CONCEPT.conceptId)
      expect(c.CONCEPT_NAME).toBe(CONCEPT.conceptName)
      expect(c.DOMAIN_ID, `${cap} lost the domain`).toBe(CONCEPT.domain)
    }
  })

  it.each(criteriaCapabilities)('%s gives every criterion a resolvable CodesetId', (cap, args) => {
    const atlas = applyAndConvert(cap, args)
    const setIds = ((atlas.ConceptSets ?? []) as unknown as Array<{ id: number }>).map(cs => cs.id)
    const json = JSON.stringify(atlas)
    // Every CodesetId referenced by a criterion must exist in ConceptSets;
    // a dangling reference yields an empty Codesets table and a cohort that
    // matches everything rather than the concept the agent chose.
    for (const m of json.matchAll(/"(?:Drug)?CodesetId":\s*(\d+)/g)) {
      expect(setIds, `${cap} referenced a codeset that is not defined`).toContain(Number(m[1]))
    }
  })

  // The capability says "Replaces any existing entry event", but the store
  // appended: asking the agent to change the entry event left the cohort
  // qualifying on either drug — roughly twice the population, with nothing
  // failing and both events sitting in the editor looking deliberate.
  it('set_entry_event replaces the entry event rather than adding a second', () => {
    const store = useCohortStore()
    store.createNewCohort()
    store.applyProposal(translateCapability('set_entry_event', { ...CONCEPT }) as never)
    store.applyProposal(translateCapability('set_entry_event', {
      conceptId: 1177480, conceptName: 'Ibuprofen', domain: 'Drug',
    }) as never)
    expect(store.currentCohort?.entryEvents).toHaveLength(1)
    const atlas = convertInternalToAtlas(store.currentCohort!) as unknown as Record<string, never>
    expect((atlas.PrimaryCriteria as unknown as { CriteriaList: unknown[] }).CriteriaList).toHaveLength(1)
  })

  // add_criterion group=entry means "another qualifying event", so it still adds.
  it('add_criterion with group entry adds an alternative entry event', () => {
    const store = useCohortStore()
    store.createNewCohort()
    store.applyProposal(translateCapability('set_entry_event', { ...CONCEPT }) as never)
    store.applyProposal(translateCapability('add_criterion', {
      conceptId: 1177480, conceptName: 'Ibuprofen', domain: 'Drug', group: 'entry',
    }) as never)
    expect(store.currentCohort?.entryEvents).toHaveLength(2)
  })

  it('set_observation_window always yields a complete ObservationWindow', () => {
    const atlas = applyAndConvert('set_observation_window', { priorDays: 365, postDays: 0 })
    const pc = atlas.PrimaryCriteria as unknown as { ObservationWindow?: { PriorDays: number; PostDays: number } }
    expect(pc.ObservationWindow).toEqual({ PriorDays: 365, PostDays: 0 })
  })
})
