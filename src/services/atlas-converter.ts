/**
 * Atlas JSON Converter Service
 * Bidirectional conversion between internal cohort format and OHDSI Atlas JSON
 *
 * CRITICAL: Uses ?? operator for zero-count preservation (not ||)
 */

import type { CohortDefinition, CohortEvent } from '@/models/cohort.types'
import type { EventAttribute } from '@/models/event.types'

// Atlas JSON types (simplified)
interface AtlasJSON {
  ConceptSets: any[]
  PrimaryCriteria: {
    CriteriaList: any[]
    ObservationWindow?: { PriorDays: number; PostDays: number }
    PrimaryLimit?: { Type: string }
  }
  InclusionRules?: any[]
  CensoringCriteria?: any[]
  QualifiedLimit?: { Type: string }
}

/**
 * Convert internal cohort definition to Atlas JSON format
 * CRITICAL: Preserves zero-count cardinality using ?? operator
 */
export function convertInternalToAtlas(cohort: CohortDefinition): AtlasJSON {
  return {
    ConceptSets: cohort.conceptSets.map((cs, index) => ({
      id: index,
      name: cs.name,
      expression: { items: [] },
    })),

    PrimaryCriteria: {
      CriteriaList: cohort.entryEvents.map(convertEventToAtlas),
      ObservationWindow: cohort.observationPeriod ? {
        PriorDays: cohort.observationPeriod.priorDays,
        PostDays: cohort.observationPeriod.postDays,
      } : undefined,
      PrimaryLimit: { Type: cohort.qualifyingLimit || 'All' },
    },

    InclusionRules: cohort.inclusionRules.map((rule) => ({
      name: rule.name,
      description: rule.description,
      expression: {
        Type: 'ALL', // Simplified
        Count: 0,
        CriteriaList: rule.criteriaGroups.flatMap(g => g.events.map(convertEventToAtlas)),
      },
    })),

    CensoringCriteria: cohort.exitCriteria ? [{
      Type: cohort.exitCriteria.strategy,
      Offset: cohort.exitCriteria.offset ?? 0, // CRITICAL: use ?? not ||
    }] : [],

    QualifiedLimit: { Type: cohort.qualifyingLimit || 'All' },
  }
}

/**
 * Convert internal event to Atlas format
 * CRITICAL: Uses ?? for zero-count preservation
 */
function convertEventToAtlas(event: CohortEvent): any {
  const atlasEvent: any = {
    Criteria: {
      [event.criteriaType]: {
        CodesetId: event.conceptSet && typeof event.conceptSet.id === 'number' ? event.conceptSet.id : 0,
        // Add other criteria fields
      },
    },
  }

  // Add cardinality (CRITICAL: use ?? not ||)
  if (event.cardinality) {
    atlasEvent.Occurrence = {
      Type: event.cardinality.type === 'AT_LEAST' ? 0 :
            event.cardinality.type === 'EXACTLY' ? 1 :
            event.cardinality.type === 'AT_MOST' ? 2 : 0,
      Count: event.cardinality.count ?? 1, // CRITICAL: ?? preserves 0
      CountMethod: event.cardinality.countingMethod,
    }
  }

  // Add temporal windows
  if (event.temporalWindow) {
    if (event.temporalWindow.startWindow) {
      atlasEvent.StartWindow = {
        Start: {
          Days: event.temporalWindow.startWindow.days,
          Coeff: event.temporalWindow.startWindow.beforeAfter === 'AFTER' ? 1 : -1,
        },
        End: event.temporalWindow.endWindow ? {
          Days: event.temporalWindow.endWindow.days,
          Coeff: event.temporalWindow.endWindow.beforeAfter === 'AFTER' ? 1 : -1,
        } : undefined,
        UseIndexEnd: event.temporalWindow.startWindow.referencePoint === 'INDEX_END',
        UseEventEnd: event.temporalWindow.startWindow.referencePoint === 'EVENT_END',
      }
    }
  }

  // Add attributes with PascalCase conversion
  if (event.attributes && event.attributes.length > 0) {
    atlasEvent.Attributes = event.attributes.map(convertAttributeToAtlas)
  }

  return atlasEvent
}

/**
 * Convert internal attribute to Atlas format
 * Maps camelCase to PascalCase
 */
function convertAttributeToAtlas(attr: EventAttribute): any {
  const atlasAttr: any = {
    Name: convertToPascalCase(attr.attributeKey),
  }

  if (attr.type === 'numericRange') {
    atlasAttr.Op = convertOperatorToAtlas(attr.operator)
    atlasAttr.Value = attr.value
    atlasAttr.Extent = attr.extent
  } else if (attr.type === 'conceptSet') {
    atlasAttr.ConceptSetId = attr.conceptSet.id
  }

  return atlasAttr
}

/**
 * Convert Atlas JSON to internal format
 */
export function convertAtlasToInternal(atlas: AtlasJSON): Partial<CohortDefinition> {
  return {
    entryEvents: atlas.PrimaryCriteria.CriteriaList.map(convertAtlasToEvent),
    observationPeriod: atlas.PrimaryCriteria.ObservationWindow ? {
      priorDays: atlas.PrimaryCriteria.ObservationWindow.PriorDays,
      postDays: atlas.PrimaryCriteria.ObservationWindow.PostDays,
    } : undefined,
    qualifyingLimit: (atlas.QualifiedLimit?.Type || 'ALL') as any,
    inclusionRules: [], // Simplified
    conceptSets: atlas.ConceptSets.map(cs => ({
      id: cs.id,
      name: cs.name,
    })),
  }
}

/**
 * Convert Atlas event to internal format
 */
function convertAtlasToEvent(atlasEvent: any): CohortEvent {
  // Extract criteria type
  const criteriaType = Object.keys(atlasEvent.Criteria)[0] as any

  return {
    id: generateId(),
    criteriaType,
    conceptSet: {
      id: atlasEvent.Criteria[criteriaType].CodesetId,
      name: `Concept Set ${atlasEvent.Criteria[criteriaType].CodesetId}`,
    },
    cardinality: atlasEvent.Occurrence ? {
      type: atlasEvent.Occurrence.Type === 0 ? 'AT_LEAST' :
            atlasEvent.Occurrence.Type === 1 ? 'EXACTLY' : 'AT_MOST',
      count: atlasEvent.Occurrence.Count ?? 1, // CRITICAL: ?? preserves 0
      countingMethod: atlasEvent.Occurrence.CountMethod || 'ALL',
    } : undefined,
    attributes: [], // Required field
  }
}

// Helpers
function convertToPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function convertOperatorToAtlas(op: string): string {
  const map: Record<string, string> = {
    GREATER_THAN: 'gt',
    GREATER_THAN_OR_EQUAL: 'gte',
    LESS_THAN: 'lt',
    LESS_THAN_OR_EQUAL: 'lte',
    EQUAL: 'eq',
    NOT_EQUAL: '!eq',
    BETWEEN: 'bt',
    NOT_BETWEEN: '!bt',
  }
  return map[op] || 'eq'
}

function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
