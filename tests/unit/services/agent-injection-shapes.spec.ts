/**
 * Shape audit for everything Pythia injects.
 *
 * The agent's proposals travel translate -> cohort store, and in the circe-native
 * model the store's expression already IS the WebAPI payload -- there is no
 * separate conversion step. Two mismatches had already shipped silently before:
 * concept-set items in ATLAS shape mapped with internal-shape keys (producing a
 * concept with no CONCEPT_ID, which broke the live preview), and `domain` vs
 * `domainId` (dropping DOMAIN_ID). Neither surfaced as an error -- the cohort
 * just quietly described the wrong thing.
 *
 * This walks every capability that can put criteria into a cohort and asserts
 * the expression that comes out the far end is actually usable. A number of
 * cases are `it.fails`: applyProposal was rewritten for the circe-native store
 * and no longer carries some of the behaviour translate.ts still promises. Each
 * is annotated with the defect it exercises; see dropped-assertions.txt and the
 * Task 8 report for the full accounting.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { translateCapability } from '@/plugins/host/capabilities/translate'
import { useCohortStore } from '@/stores/cohort'
import { CohortExpressionSchema, type CohortExpression } from '@/components/cohort-editor/circe.types'

const CONCEPT = {
  conceptId: 40481087,
  conceptName: 'Viral sinusitis',
  domain: 'Condition',
  includeDescendants: true,
}

// createNewCohort() (unlike setCohort()) does not initialise `expression` -- only
// the mounted CohortBuilder gives the store a real expression object, by copying
// its own local one in on the first save. A proposal applied to a store-only
// cohort therefore needs its own seed, matching what the mounted editor would
// already have provided.
function newCohort() {
  const store = useCohortStore()
  store.createNewCohort()
  store.currentCohort!.expression = {}
  return store
}

function applyAndParse(capability: string, args: Record<string, unknown>): CohortExpression {
  const store = newCohort()
  const proposal = translateCapability(capability, args)
  expect(proposal, `${capability} produced no proposal`).toBeTruthy()
  store.applyProposal(proposal as never)
  const parsed = CohortExpressionSchema.safeParse(store.currentCohort!.expression)
  expect(parsed.success, `${capability} produced an expression that fails CohortExpressionSchema`).toBe(true)
  return parsed.success ? parsed.data : ({} as CohortExpression)
}

function everyConcept(expr: CohortExpression) {
  const sets = expr.ConceptSets ?? []
  return sets.flatMap(cs => (cs.expression?.items ?? []).map(i => i.concept ?? {}))
}

describe('shapes of everything the agent injects', () => {
  beforeEach(() => setActivePinia(createPinia()))

  // T13: addEntryEvent, addCensoringCriterion and setCohortExit read the
  // proposal's criteriaType (or exit strategy) but never look at the embedded
  // conceptSet the event carries. The store never assigns it a numeric id and
  // never pushes it into expression.ConceptSets, so the criterion ends up with
  // no CodesetId at all -- the concept-set registration that used to run for
  // every criterion is gone from the rewritten store. Fixed in Phase 3.
  const conceptSetCapabilities: Array<[string, Record<string, unknown>]> = [
    ['set_entry_event', { ...CONCEPT }],
    ['add_exit_criterion', { strategy: 'continuous_drug', persistenceWindow: 30, concept: { ...CONCEPT } }],
    ['set_censor_event', { ...CONCEPT }],
  ]

  it.fails.each(conceptSetCapabilities)('%s produces concepts with a real CONCEPT_ID', (cap, args) => {
    const expr = applyAndParse(cap, args)
    const concepts = everyConcept(expr)
    expect(concepts.length, 'no concept sets were emitted at all').toBeGreaterThan(0)
    for (const cs of expr.ConceptSets ?? []) {
      expect(cs.expression?.items?.length, `${cap} emitted a concept set with no items`).toBeGreaterThan(0)
    }
    for (const c of concepts) {
      expect(c.CONCEPT_ID, `${cap} emitted a concept with no CONCEPT_ID`).toBe(CONCEPT.conceptId)
      expect(c.CONCEPT_NAME).toBe(CONCEPT.conceptName)
      expect(c.DOMAIN_ID, `${cap} lost the domain`).toBe(CONCEPT.domain)
    }
  })

  it.fails.each(conceptSetCapabilities)('%s gives every criterion a resolvable CodesetId', (cap, args) => {
    const expr = applyAndParse(cap, args)
    const setIds = (expr.ConceptSets ?? []).map(cs => cs.id)
    const json = JSON.stringify(expr)
    // Every CodesetId referenced by a criterion must exist in ConceptSets; a
    // dangling reference yields an empty Codesets table and a cohort that
    // matches everything rather than the concept the agent chose. Also assert
    // at least one match was found -- without it this loop runs zero times and
    // passes vacuously, which is exactly what happens once CodesetId is never
    // emitted at all.
    const matches = [...json.matchAll(/"(?:Drug)?CodesetId":\s*(\d+)/g)]
    expect(matches.length, `${cap} never assigned a CodesetId`).toBeGreaterThan(0)
    for (const m of matches) {
      expect(setIds, `${cap} referenced a codeset that is not defined`).toContain(Number(m[1]))
    }
  })

  // T14: addInclusionRule keeps the rule's name/description but drops
  // rule.criteriaGroups entirely (see the comment in src/stores/cohort.ts), so
  // the rule's `expression` is never populated and the concept the agent chose
  // never reaches the cohort. Fixed in Phase 3.
  const inclusionRuleCapabilities: Array<[string, Record<string, unknown>]> = [
    ['add_criterion', { ...CONCEPT, group: 'inclusion' }],
    ['add_criterion', { ...CONCEPT, group: 'exclusion' }],
    ['add_inclusion_rule', { name: 'On amoxicillin', events: [{ ...CONCEPT }] }],
    ['add_criteria', { name: 'Batch', events: [{ ...CONCEPT }] }],
  ]

  it.fails.each(inclusionRuleCapabilities)('%s produces concepts with a real CONCEPT_ID', (cap, args) => {
    const expr = applyAndParse(cap, args)
    const concepts = everyConcept(expr)
    expect(concepts.length, 'no concept sets were emitted at all').toBeGreaterThan(0)
    for (const cs of expr.ConceptSets ?? []) {
      expect(cs.expression?.items?.length, `${cap} emitted a concept set with no items`).toBeGreaterThan(0)
    }
    for (const c of concepts) {
      expect(c.CONCEPT_ID, `${cap} emitted a concept with no CONCEPT_ID`).toBe(CONCEPT.conceptId)
      expect(c.CONCEPT_NAME).toBe(CONCEPT.conceptName)
      expect(c.DOMAIN_ID, `${cap} lost the domain`).toBe(CONCEPT.domain)
    }
  })

  it.fails.each(inclusionRuleCapabilities)('%s gives every criterion a resolvable CodesetId', (cap, args) => {
    const expr = applyAndParse(cap, args)
    const setIds = (expr.ConceptSets ?? []).map(cs => cs.id)
    const json = JSON.stringify(expr)
    const matches = [...json.matchAll(/"(?:Drug)?CodesetId":\s*(\d+)/g)]
    expect(matches.length, `${cap} never assigned a CodesetId`).toBeGreaterThan(0)
    for (const m of matches) {
      expect(setIds, `${cap} referenced a codeset that is not defined`).toContain(Number(m[1]))
    }
  })

  // T13: addEntryEvent ignores `proposal.replace`. The capability says
  // "Replaces any existing entry event", but the store appends unconditionally:
  // asking the agent to change the entry event leaves the cohort qualifying on
  // either drug -- roughly twice the population, with nothing failing and both
  // events sitting in the editor looking deliberate. Fixed in Phase 3.
  it.fails('set_entry_event replaces the entry event rather than adding a second', () => {
    const store = newCohort()
    store.applyProposal(translateCapability('set_entry_event', { ...CONCEPT }) as never)
    store.applyProposal(translateCapability('set_entry_event', {
      conceptId: 1177480, conceptName: 'Ibuprofen', domain: 'Drug',
    }) as never)
    expect(store.currentCohort?.expression?.PrimaryCriteria?.CriteriaList).toHaveLength(1)
  })

  // add_criterion group=entry means "another qualifying event", so it still adds.
  it('add_criterion with group entry adds an alternative entry event', () => {
    const store = newCohort()
    store.applyProposal(translateCapability('set_entry_event', { ...CONCEPT }) as never)
    store.applyProposal(translateCapability('add_criterion', {
      conceptId: 1177480, conceptName: 'Ibuprofen', domain: 'Drug', group: 'entry',
    }) as never)
    expect(store.currentCohort?.expression?.PrimaryCriteria?.CriteriaList).toHaveLength(2)
  })

  // T15: removeInclusionRule is not wired into applyProposal's switch at all --
  // the store silently no-ops it, so a named rule is never removed. Fixed in
  // Phase 3.
  it.fails('remove_inclusion_rule drops the named rule and leaves the rest', () => {
    const store = newCohort()
    store.applyProposal(translateCapability('add_inclusion_rule', {
      name: 'Osteoarthritis before index', logicType: 'ALL', events: [{ ...CONCEPT }],
    }) as never)
    store.applyProposal(translateCapability('add_inclusion_rule', {
      name: 'Exclude prior GI bleed', logicType: 'AT_MOST', count: 0, events: [{ ...CONCEPT }],
    }) as never)
    expect(store.currentCohort?.expression?.InclusionRules).toHaveLength(2)

    store.applyProposal(translateCapability('remove_inclusion_rule', {
      name: 'Exclude prior GI bleed',
    }) as never)

    expect(store.currentCohort?.expression?.InclusionRules).toHaveLength(1)
    expect(store.currentCohort?.expression?.InclusionRules?.[0].name).toBe('Osteoarthritis before index')
  })

  it('remove_inclusion_rule leaves the cohort alone when nothing matches', () => {
    const store = newCohort()
    store.applyProposal(translateCapability('add_inclusion_rule', {
      name: 'Osteoarthritis before index', logicType: 'ALL', events: [{ ...CONCEPT }],
    }) as never)
    store.applyProposal(translateCapability('remove_inclusion_rule', { name: 'no such rule' }) as never)
    expect(store.currentCohort?.expression?.InclusionRules).toHaveLength(1)
  })

  // T15: removeEntryEvent is not wired into applyProposal either.
  it.fails('remove_entry_event drops the entry event built from that concept', () => {
    const store = newCohort()
    store.applyProposal(translateCapability('set_entry_event', { ...CONCEPT }) as never)
    store.applyProposal(translateCapability('add_criterion', {
      conceptId: 1177480, conceptName: 'Ibuprofen', domain: 'Drug', group: 'entry',
    }) as never)
    expect(store.currentCohort?.expression?.PrimaryCriteria?.CriteriaList).toHaveLength(2)

    store.applyProposal(translateCapability('remove_entry_event', { conceptId: 1177480 }) as never)

    expect(store.currentCohort?.expression?.PrimaryCriteria?.CriteriaList).toHaveLength(1)
  })

  // Observed live: the agent named a cohort "Adult osteoarthritis patients …"
  // and then said plainly that age was not encoded, because nothing could
  // express it. A cohort named for adults that silently contains children is
  // the same class of defect as an inverted exclusion.
  function demographicsOf(expr: CohortExpression) {
    const rules = expr.InclusionRules ?? []
    return rules.flatMap(r => r.expression?.DemographicCriteriaList ?? [])
  }

  // T14: add_demographic_criterion also goes through addInclusionRule, so it
  // hits the same criteriaGroups drop -- the Demographic event never reaches
  // DemographicCriteriaList. Fixed in Phase 3.
  it.fails('add_demographic_criterion encodes an age floor', () => {
    const expr = applyAndParse('add_demographic_criterion', { minAge: 18 })
    expect(demographicsOf(expr)[0]?.Age).toEqual({ Op: 'gte', Value: 18 })
  })

  it.fails('encodes an age range as a between', () => {
    const expr = applyAndParse('add_demographic_criterion', { minAge: 40, maxAge: 70 })
    expect(demographicsOf(expr)[0]?.Age).toEqual({ Op: 'bt', Value: 40, Extent: 70 })
  })

  it.fails('encodes sex with the CDM gender concept rather than a searched one', () => {
    const expr = applyAndParse('add_demographic_criterion', { sex: 'female' })
    const gender = demographicsOf(expr)[0]?.Gender as unknown as Array<{ CONCEPT_ID: number }> | undefined
    expect(gender?.[0]?.CONCEPT_ID).toBe(8532)
  })

  // Naming the rule doesn't touch criteriaGroups, so it survives the T14 drop.
  it('names the rule after the restriction', () => {
    const store = newCohort()
    store.applyProposal(translateCapability('add_demographic_criterion', { minAge: 18 }) as never)
    expect(store.currentCohort?.expression?.InclusionRules?.[0].name).toBe('Age 18+')
  })

  it('proposes nothing when no restriction was given', () => {
    expect(translateCapability('add_demographic_criterion', {})).toBeNull()
  })

  // T15: setEventLimits is not wired into applyProposal -- the store silently
  // no-ops it, so PrimaryCriteriaLimit/QualifiedLimit/ExpressionLimit are never
  // set. Fixed in Phase 3.
  it.fails('set_event_limits restricts entry to the first qualifying event', () => {
    const expr = applyAndParse('set_event_limits', { entryEvents: 'first' })
    expect(expr.PrimaryCriteria?.PrimaryCriteriaLimit?.Type).toBe('First')
  })

  it.fails('sets which qualifying events the rules apply to', () => {
    const expr = applyAndParse('set_event_limits', { qualifyingEvents: 'first' })
    expect(expr.QualifiedLimit?.Type).toBe('First')
  })

  it.fails('leaves the other limit alone when only one is given', () => {
    const store = newCohort()
    store.applyProposal(translateCapability('set_event_limits', { entryEvents: 'first' }) as never)
    expect(store.currentCohort!.expression!.PrimaryCriteria?.PrimaryCriteriaLimit?.Type).toBe('First')
    expect(store.currentCohort!.expression!.QualifiedLimit).toBeUndefined()
  })

  it('proposes nothing for an unrecognised limit', () => {
    expect(translateCapability('set_event_limits', { entryEvents: 'earliest-ish' })).toBeNull()
  })

  // T15: addQualifyingCriterion is not wired into applyProposal.
  it.fails('add_qualifying_criterion restricts the entry event itself', () => {
    const expr = applyAndParse('add_qualifying_criterion', { ...CONCEPT })
    expect(expr.AdditionalCriteria?.CriteriaList).toHaveLength(1)
    // and it must not have landed among the entry events instead
    expect(expr.PrimaryCriteria?.CriteriaList ?? []).toHaveLength(0)
  })

  it.fails('the qualifying criterion carries a resolvable concept set', () => {
    const expr = applyAndParse('add_qualifying_criterion', { ...CONCEPT })
    expect(expr.ConceptSets ?? []).toHaveLength(1)
  })

  // A study window is a claim about what the numbers mean; without it the
  // cohort silently spans the whole database.
  // T15: setCensorWindow is not wired into applyProposal.
  it.fails('set_censor_window bounds the study period', () => {
    const expr = applyAndParse('set_censor_window', { startDate: '2015-01-01', endDate: '2019-12-31' })
    expect(expr.CensorWindow).toMatchObject({ StartDate: '2015-01-01', EndDate: '2019-12-31' })
  })

  it('rejects a censor window that is not a date', () => {
    expect(translateCapability('set_censor_window', { startDate: 'last January' })).toBeNull()
  })

  // T15: setEraCollapse is not wired into applyProposal.
  it.fails('set_era_collapse merges brief gaps in follow-up', () => {
    const expr = applyAndParse('set_era_collapse', { gapDays: 30 })
    expect(expr.CollapseSettings).toMatchObject({ CollapseType: 'ERA', EraPad: 30 })
  })

  it.fails('set_event_limits also covers what survives the inclusion rules', () => {
    const store = newCohort()
    store.applyProposal(translateCapability('set_event_limits', { inclusionRuleEvents: 'first' }) as never)
    expect(store.currentCohort?.expression?.ExpressionLimit?.Type).toBe('First')
  })

  // setObservationPeriod is fully implemented -- no defect here.
  it('set_observation_window always yields a complete ObservationWindow', () => {
    const expr = applyAndParse('set_observation_window', { priorDays: 365, postDays: 0 })
    expect(expr.PrimaryCriteria?.ObservationWindow).toEqual({ PriorDays: 365, PostDays: 0 })
  })
})
