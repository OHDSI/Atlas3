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

  // "Actually, drop that one" is an obvious thing to ask an assistant that has
  // just built you a phenotype. Without removal the agent's only honest answer
  // was to rebuild the cohort or tell the user to edit it by hand.
  it('remove_inclusion_rule drops the named rule and leaves the rest', () => {
    const store = useCohortStore()
    store.createNewCohort()
    store.applyProposal(translateCapability('add_inclusion_rule', {
      name: 'Osteoarthritis before index', logicType: 'ALL', events: [{ ...CONCEPT }],
    }) as never)
    store.applyProposal(translateCapability('add_inclusion_rule', {
      name: 'Exclude prior GI bleed', logicType: 'AT_MOST', count: 0, events: [{ ...CONCEPT }],
    }) as never)
    expect(store.currentCohort?.inclusionRules).toHaveLength(2)

    store.applyProposal(translateCapability('remove_inclusion_rule', {
      name: 'Exclude prior GI bleed',
    }) as never)

    expect(store.currentCohort?.inclusionRules).toHaveLength(1)
    expect(store.currentCohort?.inclusionRules[0].name).toBe('Osteoarthritis before index')
  })

  it('remove_inclusion_rule leaves the cohort alone when nothing matches', () => {
    const store = useCohortStore()
    store.createNewCohort()
    store.applyProposal(translateCapability('add_inclusion_rule', {
      name: 'Osteoarthritis before index', logicType: 'ALL', events: [{ ...CONCEPT }],
    }) as never)
    store.applyProposal(translateCapability('remove_inclusion_rule', { name: 'no such rule' }) as never)
    expect(store.currentCohort?.inclusionRules).toHaveLength(1)
  })

  it('remove_entry_event drops the entry event built from that concept', () => {
    const store = useCohortStore()
    store.createNewCohort()
    store.applyProposal(translateCapability('set_entry_event', { ...CONCEPT }) as never)
    store.applyProposal(translateCapability('add_criterion', {
      conceptId: 1177480, conceptName: 'Ibuprofen', domain: 'Drug', group: 'entry',
    }) as never)
    expect(store.currentCohort?.entryEvents).toHaveLength(2)

    store.applyProposal(translateCapability('remove_entry_event', { conceptId: 1177480 }) as never)

    expect(store.currentCohort?.entryEvents).toHaveLength(1)
  })

  // Observed live: the agent named a cohort "Adult osteoarthritis patients …"
  // and then said plainly that age was not encoded, because nothing could
  // express it. A cohort named for adults that silently contains children is
  // the same class of defect as an inverted exclusion.
  function demographicsOf(atlas: Record<string, never>) {
    const rules = (atlas.InclusionRules ?? []) as unknown as Array<{
      expression: { DemographicCriteriaList?: Array<Record<string, never>> }
    }>
    return rules.flatMap(r => r.expression.DemographicCriteriaList ?? [])
  }

  it('add_demographic_criterion encodes an age floor', () => {
    const atlas = applyAndConvert('add_demographic_criterion', { minAge: 18 })
    expect(demographicsOf(atlas)[0]?.Age).toEqual({ Op: 'gte', Value: 18 })
  })

  it('encodes an age range as a between', () => {
    const atlas = applyAndConvert('add_demographic_criterion', { minAge: 40, maxAge: 70 })
    expect(demographicsOf(atlas)[0]?.Age).toEqual({ Op: 'bt', Value: 40, Extent: 70 })
  })

  it('encodes sex with the CDM gender concept rather than a searched one', () => {
    const atlas = applyAndConvert('add_demographic_criterion', { sex: 'female' })
    const gender = demographicsOf(atlas)[0]?.Gender as unknown as Array<{ CONCEPT_ID: number }>
    expect(gender?.[0]?.CONCEPT_ID).toBe(8532)
  })

  it('names the rule after the restriction', () => {
    const store = useCohortStore()
    store.createNewCohort()
    store.applyProposal(translateCapability('add_demographic_criterion', { minAge: 18 }) as never)
    expect(store.currentCohort?.inclusionRules[0].name).toBe('Age 18+')
  })

  it('proposes nothing when no restriction was given', () => {
    expect(translateCapability('add_demographic_criterion', {})).toBeNull()
  })

  // The instructions tell the agent that a new-user design wants the FIRST
  // qualifying event, and phenotype_patterns reports what the library uses —
  // but until this capability existed there was no way to act on either. The
  // default puts a person in the cohort once per qualifying event, so the
  // counts silently mean episodes rather than people.
  it('set_event_limits restricts entry to the first qualifying event', () => {
    const atlas = applyAndConvert('set_event_limits', { entryEvents: 'first' })
    const pc = atlas.PrimaryCriteria as unknown as { PrimaryCriteriaLimit: { Type: string } }
    expect(pc.PrimaryCriteriaLimit.Type).toBe('First')
  })

  it('sets which qualifying events the rules apply to', () => {
    const atlas = applyAndConvert('set_event_limits', { qualifyingEvents: 'first' })
    expect((atlas.QualifiedLimit as unknown as { Type: string }).Type).toBe('First')
  })

  it('leaves the other limit alone when only one is given', () => {
    const store = useCohortStore()
    store.createNewCohort()
    const before = store.currentCohort!.qualifyingLimit
    store.applyProposal(translateCapability('set_event_limits', { entryEvents: 'first' }) as never)
    expect(store.currentCohort!.primaryCriteriaLimit).toBe('FIRST')
    expect(store.currentCohort!.qualifyingLimit).toBe(before)
  })

  it('proposes nothing for an unrecognised limit', () => {
    expect(translateCapability('set_event_limits', { entryEvents: 'earliest-ish' })).toBeNull()
  })

  it('add_qualifying_criterion restricts the entry event itself', () => {
    const atlas = applyAndConvert('add_qualifying_criterion', { ...CONCEPT })
    const add = atlas.AdditionalCriteria as unknown as {
      CriteriaList: Array<{ Criteria?: unknown; ConditionOccurrence?: unknown }>
    }
    expect(add?.CriteriaList).toHaveLength(1)
    // and it must not have landed among the entry events instead
    expect((atlas.PrimaryCriteria as unknown as { CriteriaList: unknown[] }).CriteriaList).toHaveLength(0)
  })

  it('the qualifying criterion carries a resolvable concept set', () => {
    const atlas = applyAndConvert('add_qualifying_criterion', { ...CONCEPT })
    const sets = (atlas.ConceptSets ?? []) as unknown as Array<{ id: number; expression: { items: unknown[] } }>
    expect(sets).toHaveLength(1)
    expect(sets[0].expression.items).toHaveLength(1)
  })

  // A study window is a claim about what the numbers mean; without it the
  // cohort silently spans the whole database.
  it('set_censor_window bounds the study period', () => {
    const atlas = applyAndConvert('set_censor_window', { startDate: '2015-01-01', endDate: '2019-12-31' })
    expect(atlas.CensorWindow).toMatchObject({ StartDate: '2015-01-01', EndDate: '2019-12-31' })
  })

  it('rejects a censor window that is not a date', () => {
    expect(translateCapability('set_censor_window', { startDate: 'last January' })).toBeNull()
  })

  it('set_era_collapse merges brief gaps in follow-up', () => {
    const atlas = applyAndConvert('set_era_collapse', { gapDays: 30 })
    expect(atlas.CollapseSettings).toMatchObject({ CollapseType: 'ERA', EraPad: 30 })
  })

  it('set_event_limits also covers what survives the inclusion rules', () => {
    const store = useCohortStore()
    store.createNewCohort()
    store.applyProposal(translateCapability('set_event_limits', { inclusionRuleEvents: 'first' }) as never)
    expect(store.currentCohort?.inclusionQualifyingLimit).toBe('FIRST')
  })

  it('set_observation_window always yields a complete ObservationWindow', () => {
    const atlas = applyAndConvert('set_observation_window', { priorDays: 365, postDays: 0 })
    const pc = atlas.PrimaryCriteria as unknown as { ObservationWindow?: { PriorDays: number; PostDays: number } }
    expect(pc.ObservationWindow).toEqual({ PriorDays: 365, PostDays: 0 })
  })
})
