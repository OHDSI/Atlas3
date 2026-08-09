import { describe, it, expect } from 'vitest'
import original from './__fixtures__/original-schemas.json'
import { CAPABILITIES, capabilityNames, getCapability } from '@/plugins/host/capabilities/registry'

const EXPECTED_NAMES = [
  'add_criterion', 'add_criteria', 'set_entry_event', 'set_observation_window',
  'add_exit_criterion', 'set_censor_event', 'create_standalone_concept_set',
  'navigate_to', 'add_inclusion_rule', 'create_feature_analysis',
  'create_characterization', 'create_pathway', 'generate_analysis',
  'update_concept_set',
  'update_feature_analysis', 'update_characterization', 'update_pathway',
  'update_incidence_rate', 'create_incidence_rate', 'save_cohort',
  'remove_inclusion_rule', 'remove_entry_event', 'use_concept_set',
  'add_demographic_criterion', 'set_event_limits', 'add_qualifying_criterion',
  'set_censor_window', 'set_era_collapse',
]

describe('capability registry', () => {
  it('exposes exactly the 28 artifact-editing capabilities', () => {
    expect(new Set(capabilityNames())).toEqual(new Set(EXPECTED_NAMES))
  })
  it('every capability has an object schema and a description', () => {
    for (const c of CAPABILITIES) {
      expect(c.schema.type).toBe('object')
      expect(c.description.length).toBeGreaterThan(0)
    }
  })
  // Capabilities introduced in ATLAS after the cljs migration have no entry in
  // the original-schemas fixture, so they're outside the drift check.
  const ADDED_IN_ATLAS = new Set(['generate_analysis', 'remove_inclusion_rule', 'remove_entry_event', 'use_concept_set', 'add_demographic_criterion', 'set_event_limits', 'add_qualifying_criterion', 'set_censor_window', 'set_era_collapse'])

  it('schemas match the pinned schema baseline', () => {
    for (const name of EXPECTED_NAMES.filter(n => !ADDED_IN_ATLAS.has(n))) {
      expect(getCapability(name)?.schema).toEqual((original as Record<string, unknown>)[name])
    }
  })
  it('navigate_to view enum matches the agent-visible route manifest', () => {
    const viewEnum = (getCapability('navigate_to')!.schema.properties as any).view.enum as string[]
    expect(viewEnum).toContain('cohort-edit')
    expect(viewEnum).not.toContain('login')
  })
})
