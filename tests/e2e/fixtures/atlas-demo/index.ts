/**
 * Atlas Compatibility Test Fixtures
 *
 * Cohort definitions, incidence rates, pathway analyses, characterizations,
 * and feature analyses in Atlas 2.x format. Used to verify format compatibility
 * between Atlas3 and Atlas 2.x.
 *
 * Uses readFileSync to avoid ESM `with { type: 'json' }` issues in Playwright.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function loadJSON(filename: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(__dirname, filename), 'utf-8'))
}

function loadJSONArray(filename: string): Record<string, unknown>[] {
  return JSON.parse(readFileSync(resolve(__dirname, filename), 'utf-8'))
}

export interface AtlasDemoCohort {
  id: number
  name: string
  description: string
  expression: Record<string, unknown>
  criteriaType: string
  features: string[]
}

export const atlasDemoCohorts: AtlasDemoCohort[] = [
  // ── Measurement criteria ─────────────────────────────────────
  {
    id: 1,
    name: 'Measurement with ValueAsNumber and Age filter',
    description: 'Measurement entry event with numeric value >= 30 and Age >= 18',
    expression: loadJSON('cohort-measurement-value-age.json'),
    criteriaType: 'Measurement',
    features: ['ValueAsNumber', 'Age', 'QualifiedLimit:First'],
  },
  {
    id: 2,
    name: 'Measurement entry (simple)',
    description: 'Measurement entry event with single concept set',
    expression: loadJSON('cohort-measurement-simple.json'),
    criteriaType: 'Measurement',
    features: ['Measurement'],
  },

  // ── ConditionOccurrence criteria ─────────────────────────────
  {
    id: 3,
    name: 'Condition with VisitType filter and inclusion rules',
    description: 'ConditionOccurrence with VisitType concept array and 3 inclusion rules',
    expression: loadJSON('cohort-condition-visittype-inclusionrules.json'),
    criteriaType: 'ConditionOccurrence',
    features: ['VisitType', 'InclusionRules', 'EndStrategy', 'isExcluded'],
  },
  {
    id: 4,
    name: 'Condition with AdditionalCriteria (no concept sets)',
    description: 'ConditionOccurrence with AdditionalCriteria but no concept sets',
    expression: loadJSON('cohort-condition-additionalcriteria-nocs.json'),
    criteriaType: 'ConditionOccurrence',
    features: ['ConditionOccurrence', 'AdditionalCriteria', 'NoConceptSets'],
  },
  {
    id: 5,
    name: 'Condition with AdditionalCriteria (4 concept sets)',
    description: 'ConditionOccurrence with AdditionalCriteria and 4 concept sets',
    expression: loadJSON('cohort-condition-additionalcriteria-4cs.json'),
    criteriaType: 'ConditionOccurrence',
    features: ['ConditionOccurrence', 'AdditionalCriteria'],
  },
  {
    id: 6,
    name: 'Condition with location filter',
    description: 'ConditionOccurrence (location test)',
    expression: loadJSON('cohort-condition-location.json'),
    criteriaType: 'ConditionOccurrence',
    features: ['ConditionOccurrence'],
  },
  {
    id: 7,
    name: 'Condition with correlated criteria',
    description: 'ConditionOccurrence with correlated criteria structure',
    expression: loadJSON('cohort-condition-correlated.json'),
    criteriaType: 'ConditionOccurrence',
    features: ['ConditionOccurrence', 'CorrelatedCriteria'],
  },

  // ── DrugExposure criteria ────────────────────────────────────
  {
    id: 8,
    name: 'Drug with First flag and multiple concept items',
    description: 'DrugExposure with First boolean and multi-item concept set',
    expression: loadJSON('cohort-drug-first-multiconceptitems.json'),
    criteriaType: 'DrugExposure',
    features: ['First', 'MultipleConceptSetItems'],
  },
  {
    id: 9,
    name: 'Drug with Age, date filter, inclusion rules, censor window',
    description: 'Complex DrugExposure with Age, OccurrenceStartDate, 8+ inclusion rules',
    expression: loadJSON('cohort-drug-complex-age-date-censor.json'),
    criteriaType: 'DrugExposure',
    features: ['Age', 'OccurrenceStartDate', 'InclusionRules', 'EndStrategy', 'CensorWindow', 'MultipleConceptSets'],
  },
  {
    id: 10,
    name: 'Drug with AdditionalCriteria and temporal windows',
    description: 'DrugExposure with AdditionalCriteria, zero-occurrence, temporal constraints',
    expression: loadJSON('cohort-drug-additionalcriteria-temporal.json'),
    criteriaType: 'DrugExposure',
    features: ['AdditionalCriteria', 'OccurrenceStartDate', 'TemporalWindow', 'Occurrence:EXACTLY_0', 'MultipleConceptSets'],
  },
  {
    id: 11,
    name: 'Drug with censoring criteria and EndStrategy',
    description: 'DrugExposure with 4 inclusion rules, 5 censoring criteria, EndStrategy, CensorWindow',
    expression: loadJSON('cohort-drug-censoring-endstrategy.json'),
    criteriaType: 'DrugExposure',
    features: ['InclusionRules', 'CensoringCriteria', 'EndStrategy', 'CensorWindow', 'ManyConceptSets'],
  },

  // ── ProcedureOccurrence criteria ─────────────────────────────
  {
    id: 12,
    name: 'Procedure entry (simple)',
    description: 'ProcedureOccurrence with single concept set',
    expression: loadJSON('cohort-procedure-simple.json'),
    criteriaType: 'ProcedureOccurrence',
    features: ['ProcedureOccurrence'],
  },
  {
    id: 13,
    name: 'Procedure with condition inclusion rule',
    description: 'ProcedureOccurrence + ConditionOccurrence with inclusion rules',
    expression: loadJSON('cohort-procedure-condition-inclusionrule.json'),
    criteriaType: 'ProcedureOccurrence',
    features: ['ProcedureOccurrence', 'ConditionOccurrence', 'InclusionRules'],
  },

  // ── DeviceExposure criteria ──────────────────────────────────
  {
    id: 14,
    name: 'Device + Procedure + Drug multi-type entry',
    description: 'DeviceExposure + ProcedureOccurrence + DrugExposure with 6 inclusion rules',
    expression: loadJSON('cohort-device-procedure-drug-multi.json'),
    criteriaType: 'DeviceExposure',
    features: ['DeviceExposure', 'ProcedureOccurrence', 'DrugExposure', 'InclusionRules', 'MultipleConceptSets'],
  },

  // ── VisitOccurrence criteria ─────────────────────────────────
  {
    id: 15,
    name: 'Visit entry (simple)',
    description: 'VisitOccurrence entry event',
    expression: loadJSON('cohort-visit-simple.json'),
    criteriaType: 'VisitOccurrence',
    features: ['VisitOccurrence'],
  },
  {
    id: 16,
    name: 'Visit with inclusion rules',
    description: 'VisitOccurrence with 2 inclusion rules',
    expression: loadJSON('cohort-visit-inclusionrules.json'),
    criteriaType: 'VisitOccurrence',
    features: ['VisitOccurrence', 'InclusionRules'],
  },
  {
    id: 17,
    name: 'Visit with payer plan reference',
    description: 'VisitOccurrence referencing payer plan',
    expression: loadJSON('cohort-visit-payer.json'),
    criteriaType: 'VisitOccurrence',
    features: ['VisitOccurrence', 'PayerPlanPeriod'],
  },
  {
    id: 18,
    name: 'Visit with nested criteria groups',
    description: 'VisitOccurrence with nested criteria groups',
    expression: loadJSON('cohort-visit-nestedgroups.json'),
    criteriaType: 'VisitOccurrence',
    features: ['VisitOccurrence', 'NestedCriteria'],
  },

  // ── VisitDetail criteria ─────────────────────────────────────
  {
    id: 19,
    name: 'VisitDetail entry (simple)',
    description: 'VisitDetail entry event without concept sets',
    expression: loadJSON('cohort-visitdetail-simple.json'),
    criteriaType: 'VisitDetail',
    features: ['VisitDetail'],
  },
  {
    id: 20,
    name: 'VisitDetail with specialty filter',
    description: 'VisitDetail with concept set',
    expression: loadJSON('cohort-visitdetail-specialty.json'),
    criteriaType: 'VisitDetail',
    features: ['VisitDetail'],
  },

  // ── Death criteria ───────────────────────────────────────────
  {
    id: 21,
    name: 'Death with type and source concept',
    description: 'Death entry event with concept set',
    expression: loadJSON('cohort-death-type-source.json'),
    criteriaType: 'Death',
    features: ['Death'],
  },
  {
    id: 22,
    name: 'Death + Condition complex (21 concept sets, 9 inclusion rules)',
    description: 'Death + ConditionOccurrence with AdditionalCriteria, EndStrategy, nested groups',
    expression: loadJSON('cohort-death-condition-complex-21cs.json'),
    criteriaType: 'Death',
    features: ['Death', 'ConditionOccurrence', 'InclusionRules', 'EndStrategy', 'NestedCriteria', 'ManyConceptSets'],
  },

  // ── Specimen criteria ────────────────────────────────────────
  {
    id: 23,
    name: 'Specimen entry (simple)',
    description: 'Specimen entry event',
    expression: loadJSON('cohort-specimen-simple.json'),
    criteriaType: 'Specimen',
    features: ['Specimen'],
  },

  // ── ObservationPeriod criteria ───────────────────────────────
  {
    id: 24,
    name: 'ObservationPeriod entry (no concept sets)',
    description: 'ObservationPeriod entry without concept sets',
    expression: loadJSON('cohort-observationperiod-noconceptsets.json'),
    criteriaType: 'ObservationPeriod',
    features: ['ObservationPeriod', 'NoConceptSets'],
  },
  {
    id: 25,
    name: 'ObservationPeriod with inclusion rule',
    description: 'ObservationPeriod with inclusion rules',
    expression: loadJSON('cohort-observationperiod-inclusionrule.json'),
    criteriaType: 'ObservationPeriod',
    features: ['ObservationPeriod', 'InclusionRules'],
  },

  // ── Era criteria ─────────────────────────────────────────────
  {
    id: 26,
    name: 'ConditionEra + DrugEra multi-type entry',
    description: 'ConditionEra and DrugEra as entry events',
    expression: loadJSON('cohort-conditionera-drugera.json'),
    criteriaType: 'ConditionEra',
    features: ['ConditionEra', 'DrugEra'],
  },

  // ── Multi-type criteria ──────────────────────────────────────
  {
    id: 27,
    name: 'Multi-type: Condition + Measurement + Observation',
    description: 'Multiple criteria types with EndStrategy',
    expression: loadJSON('cohort-multi-condition-measurement-observation.json'),
    criteriaType: 'Measurement',
    features: ['Measurement', 'Observation', 'ConditionOccurrence', 'EndStrategy'],
  },

  // ── Nested / Correlated criteria ─────────────────────────────
  {
    id: 28,
    name: 'Nested criteria with AdditionalCriteria groups',
    description: 'ConditionOccurrence with AdditionalCriteria containing nested groups',
    expression: loadJSON('cohort-nestedcriteria-additionalcriteria.json'),
    criteriaType: 'ConditionOccurrence',
    features: ['AdditionalCriteria', 'NestedCriteria'],
  },
  {
    id: 29,
    name: 'Nested criteria (no primary entry events)',
    description: 'Only AdditionalCriteria, no primary criteria entries',
    expression: loadJSON('cohort-nestedcriteria-noentry.json'),
    criteriaType: 'Demographic',
    features: ['AdditionalCriteria', 'NestedCriteria'],
  },

  // ── Demographic criteria ─────────────────────────────────────
  {
    id: 30,
    name: 'Demographic: Age, Gender, Race, Ethnicity',
    description: 'Demographic criteria in inclusion rules',
    expression: loadJSON('cohort-demographic-age-gender-race.json'),
    criteriaType: 'Demographic',
    features: ['Demographic', 'Gender', 'Race', 'Ethnicity', 'Age', 'InclusionRules'],
  },
  {
    id: 31,
    name: 'Demographic: Gender with concept set reference',
    description: 'Gender-based demographic criteria with concept set',
    expression: loadJSON('cohort-demographic-gender-conceptset.json'),
    criteriaType: 'Demographic',
    features: ['Demographic', 'Gender', 'ConceptSet'],
  },
]

export const atlasDemoPathway = loadJSON('pathway-analysis.json')
export const atlasDemoPathways = loadJSONArray('pathways.json')
export const atlasDemoIncidenceRate = loadJSON('incidence-rate.json')
export const atlasDemoIncidenceRates = loadJSONArray('incidence-rates.json')
export const atlasDemoCharacterization = loadJSON('characterization.json')
export const atlasDemoCharacterizations = loadJSONArray('characterizations.json')
