/**
 * Shape audit for everything Pythia injects.
 *
 * The agent's proposals travel translate -> cohort store -> native cohort
 * expression, and each hop has its own idea of an item's shape. Two mismatches
 * had already shipped silently: concept-set items in internal-shape keys
 * (producing a concept with no conceptId, which broke the live preview), and
 * `domain` vs `domainId` (dropping domainId). Neither surfaced as an error —
 * the cohort just quietly described the wrong thing.
 *
 * This walks every capability that can put criteria into a cohort and asserts
 * the ATLAS JSON that comes out the far end is actually usable.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { translateCapability } from '@/plugins/host/capabilities/translate'
import { useCohortStore } from '@/stores/cohort'
import { applyProposalDirect } from '@/plugins/host/pythiaBridge'

const CONCEPT = {
  conceptId: 40481087,
  conceptName: 'Viral sinusitis',
  domain: 'Condition',
  includeDescendants: true,
}

async function applyAndInspect(capability: string, args: Record<string, unknown>) {
  const store = useCohortStore()
  store.createNewCohort()
  const proposal = translateCapability(capability, args)
  expect(proposal, `${capability} produced no proposal`).toBeTruthy()
  await applyProposalDirect(proposal as never)
  return store.currentCohort!
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

  it.each(criteriaCapabilities)('%s gives every criterion a resolvable CodesetId', async (cap, args) => {
    const cohort = await applyAndInspect(cap, args)
    const setIds = (cohort.expression?.ConceptSets ?? []).map(cs => cs.id)
    const json = JSON.stringify(cohort)
    // Every CodesetId referenced by a criterion must exist in ConceptSets;
    // a dangling reference yields an empty Codesets table and a cohort that
    // matches everything rather than the concept the agent chose.
    for (const m of json.matchAll(/"(?:Drug)?CodesetId":\s*(\d+)/g)) {
      expect(setIds, `${cap} referenced a codeset that is not defined`).toContain(Number(m[1]))
    }
  })

  // add_criterion group=entry means "another qualifying event", so it still adds.
  it('add_criterion with group entry adds an alternative entry event', async () => {
    const store = useCohortStore()
    store.createNewCohort()
    await applyProposalDirect(translateCapability('set_entry_event', { ...CONCEPT }) as never)!
    await applyProposalDirect(translateCapability('add_criterion', {
      conceptId: 1177480, conceptName: 'Ibuprofen', domain: 'Drug', group: 'entry',
    }) as never)
    expect(store.currentCohort?.expression?.PrimaryCriteria?.CriteriaList).toHaveLength(2)
  })

  it('set_observation_window always yields a complete ObservationWindow', async () => {
    const cohort = await applyAndInspect('set_observation_window', { priorDays: 365, postDays: 0 })
    expect(cohort.expression?.PrimaryCriteria?.ObservationWindow).toEqual({ PriorDays: 365, PostDays: 0 })
  })
})
