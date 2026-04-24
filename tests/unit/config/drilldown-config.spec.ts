import { describe, it, expect } from 'vitest'
import { DOMAIN_DRILLDOWN_FIELDS, type Domain } from '@/config/drilldown-config'

describe('DOMAIN_DRILLDOWN_FIELDS', () => {
  it('covers all 8 domains', () => {
    const domains: Domain[] = [
      'condition', 'conditionEra', 'drug', 'drugEra',
      'measurement', 'observation', 'procedure', 'visit'
    ]
    domains.forEach(d => expect(DOMAIN_DRILLDOWN_FIELDS[d]).toBeDefined())
  })

  it('includes byType for condition, drug, procedure, observation, measurement', () => {
    expect(DOMAIN_DRILLDOWN_FIELDS.condition).toContain('byType')
    expect(DOMAIN_DRILLDOWN_FIELDS.drug).toContain('byType')
    expect(DOMAIN_DRILLDOWN_FIELDS.procedure).toContain('byType')
    expect(DOMAIN_DRILLDOWN_FIELDS.observation).toContain('byType')
    expect(DOMAIN_DRILLDOWN_FIELDS.measurement).toContain('byType')
  })

  it('includes lengthOfEra only for era domains', () => {
    expect(DOMAIN_DRILLDOWN_FIELDS.conditionEra).toContain('lengthOfEra')
    expect(DOMAIN_DRILLDOWN_FIELDS.drugEra).toContain('lengthOfEra')
    expect(DOMAIN_DRILLDOWN_FIELDS.condition).not.toContain('lengthOfEra')
  })

  it('includes byUnit and byOperator only for measurement', () => {
    expect(DOMAIN_DRILLDOWN_FIELDS.measurement).toContain('byUnit')
    expect(DOMAIN_DRILLDOWN_FIELDS.measurement).toContain('byOperator')
    expect(DOMAIN_DRILLDOWN_FIELDS.observation).not.toContain('byUnit')
  })

  it('includes byQualifier only for observation', () => {
    expect(DOMAIN_DRILLDOWN_FIELDS.observation).toContain('byQualifier')
    expect(DOMAIN_DRILLDOWN_FIELDS.measurement).not.toContain('byQualifier')
  })
})
