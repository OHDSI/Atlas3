/**
 * Atlas JSON Converter Service
 * Bidirectional conversion between internal cohort format and OHDSI Atlas JSON
 *
 * CRITICAL: Uses ?? operator for zero-count preservation (not ||)
 */

import type { CohortDefinition, CohortEvent, CriteriaType, Period, DateField, QualifyingLimit, LogicType } from '@/models/cohort.types'
import type { EventAttribute } from '@/models/event.types'
import type {
  AtlasConceptSet,
  AtlasCriteria,
  AtlasInclusionRule,
  AtlasConcept,
  ConceptSetItem,
  AtlasCriteriaTypeObject,
  AtlasConceptSetItem
} from '@/models/atlas.types'

// Atlas JSON types (complete)
interface AtlasJSON {
  expressionType?: string
  cdmVersionRange?: string
  ConceptSets: AtlasConceptSet[]
  PrimaryCriteria: {
    CriteriaList: AtlasCriteria[]
    ObservationWindow?: { PriorDays: number; PostDays: number }
    PrimaryCriteriaLimit?: { Type: string }
  }
  AdditionalCriteria?: {
    Type: string
    CriteriaList: AtlasCriteria[]
    DemographicCriteriaList: Record<string, unknown>[]
    Groups: AtlasCriteria[]
  }
  InclusionRules?: AtlasInclusionRule[]
  CensoringCriteria?: AtlasCriteria[]
  QualifiedLimit?: { Type: string }
  ExpressionLimit?: { Type: string }
  CollapseSettings?: {
    CollapseType: string
    EraPad: number
  }
  CensorWindow?: Record<string, unknown>
}

/**
 * Convert internal cohort definition to Atlas JSON format
 * CRITICAL: Preserves zero-count cardinality using ?? operator
 */
export function convertInternalToAtlas(cohort: CohortDefinition): AtlasJSON {
  return {
    // Expression type - required by Atlas
    expressionType: cohort.expressionType ?? "SIMPLE_EXPRESSION",

    // CDM version range - required by checkV2
    cdmVersionRange: cohort.cdmVersionRange ?? ">=5.0.0",

    ConceptSets: cohort.conceptSets.map((cs, index) => ({
      id: typeof cs.id === 'number' ? cs.id : index,
      name: cs.name,
      expression: {
        items: (cs.items as ConceptSetItem[] | undefined)?.map((item) => {
          const concept: AtlasConcept = {
            CONCEPT_ID: item.conceptId,
            CONCEPT_NAME: item.conceptName,
            DOMAIN_ID: item.domainId,
            VOCABULARY_ID: item.vocabularyId,
            CONCEPT_CLASS_ID: item.conceptClassId,
          }

          // Only add optional fields if they exist
          if (item.conceptCode !== undefined && item.conceptCode !== null) {
            concept.CONCEPT_CODE = item.conceptCode
          }
          if (item.standardConcept !== undefined && item.standardConcept !== null) {
            concept.STANDARD_CONCEPT = item.standardConcept
          }
          if (item.invalidReason !== undefined && item.invalidReason !== null) {
            concept.INVALID_REASON = item.invalidReason
          }

          return {
            concept,
            isExcluded: item.isExcluded ?? false,
            includeDescendants: item.includeDescendants ?? false,
            includeMapped: item.includeMapped ?? false,
          }
        }) || []
      },
    })),

    PrimaryCriteria: {
      CriteriaList: cohort.entryEvents.map((event) => convertEventToAtlas(event, false)),
      ObservationWindow: cohort.observationPeriod ? {
        PriorDays: cohort.observationPeriod.priorDays,
        PostDays: cohort.observationPeriod.postDays,
      } : undefined,
      PrimaryCriteriaLimit: { Type: cohort.additionalCriteria?.qualifyingLimit || 'All' },
    },

    // Additional criteria structure - required by checkV2
    AdditionalCriteria: cohort.additionalCriteria ? {
      Type: cohort.additionalCriteria.logicType || "ALL",
      CriteriaList: cohort.additionalCriteria.events.map(e => convertEventToAtlas(e, true)),
      DemographicCriteriaList: [],
      Groups: [],
    } : {
      Type: "ALL",
      CriteriaList: [],
      DemographicCriteriaList: [],
      Groups: [],
    },

    InclusionRules: cohort.inclusionRules.map((rule) => ({
      name: rule.name,
      description: rule.description,
      expression: {
        Type: 'ALL', // Simplified
        CriteriaList: rule.criteriaGroups.flatMap(g => g.events.map(e => convertEventToAtlas(e, true))),
        DemographicCriteriaList: [],
        Groups: [],
      },
    })),

    // CensoringCriteria - US4: Convert censoring criteria events
    CensoringCriteria: cohort.censoringCriteria?.map(e => convertEventToAtlas(e, false)) || [],

    QualifiedLimit: { Type: capitalizeFirst(cohort.qualifyingLimit || 'All') },

    // Expression limit - required by checkV2
    ExpressionLimit: cohort.inclusionQualifyingLimit
      ? { Type: capitalizeFirst(cohort.inclusionQualifyingLimit) }
      : { Type: "All" },

    // Collapse settings - required by checkV2
    CollapseSettings: cohort.collapseSettings ? {
      CollapseType: cohort.collapseSettings.collapseType,
      EraPad: cohort.collapseSettings.eraPad,
    } : {
      CollapseType: "ERA",
      EraPad: 0,
    },

    // Censor window - required by checkV2 (empty object is acceptable)
    CensorWindow: cohort.censorWindow ? convertPeriodToAtlas(cohort.censorWindow) : {},
  }
}

/**
 * Convert internal event to Atlas format
 * CRITICAL: Uses ?? for zero-count preservation
 * @param event The event to convert
 * @param wrapInCriteria Whether to wrap the criteria in a "Criteria" object (for InclusionRules)
 */
function convertEventToAtlas(event: CohortEvent, wrapInCriteria: boolean = false): AtlasCriteria {
  // Build the criteria object with CodesetId and attributes
  const criteriaTypeObj: AtlasCriteriaTypeObject = {
    CodesetId: event.conceptSet && typeof event.conceptSet.id === 'number' ? event.conceptSet.id : 0,
  }

  // Add type-specific exclude flags (defaults to false)
  // These are required by Atlas for certain criteria types
  switch (event.criteriaType) {
    case 'ConditionOccurrence':
      criteriaTypeObj.ConditionTypeExclude = false
      break
    case 'ConditionEra':
      criteriaTypeObj.EraTypeExclude = false
      break
    case 'DrugExposure':
      criteriaTypeObj.DrugTypeExclude = false
      break
    case 'DrugEra':
      criteriaTypeObj.EraTypeExclude = false
      break
    case 'DoseEra':
      criteriaTypeObj.EraTypeExclude = false
      break
    case 'ProcedureOccurrence':
      criteriaTypeObj.ProcedureTypeExclude = false
      break
    case 'Measurement':
      criteriaTypeObj.MeasurementTypeExclude = false
      break
    case 'Observation':
      criteriaTypeObj.ObservationTypeExclude = false
      break
    case 'ObservationPeriod':
      criteriaTypeObj.PeriodTypeExclude = false
      break
    case 'VisitOccurrence':
      criteriaTypeObj.VisitTypeExclude = false
      break
    case 'VisitDetail':
      criteriaTypeObj.VisitDetailTypeExclude = false
      break
    case 'DeviceExposure':
      criteriaTypeObj.DeviceTypeExclude = false
      break
    case 'Specimen':
      criteriaTypeObj.SpecimenTypeExclude = false
      break
    case 'Death':
      criteriaTypeObj.DeathTypeExclude = false
      break
    case 'PayerPlanPeriod':
      criteriaTypeObj.PeriodTypeExclude = false
      break
    case 'LocationRegion':
      // LocationRegion doesn't have a type exclude flag in Atlas
      break
  }

  // Add attributes directly to the criteria type object (not in an Attributes array)
  if (event.attributes && event.attributes.length > 0) {
    event.attributes.forEach(attr => {
      const atlasAttr = convertAttributeToAtlas(attr)
      // Add the attribute properties directly to the criteria object
      Object.assign(criteriaTypeObj, atlasAttr)
    })
  }

  const criteriaObject: Record<string, AtlasCriteriaTypeObject> = {
    [event.criteriaType]: criteriaTypeObj,
  }

  const atlasEvent: AtlasCriteria = wrapInCriteria ? { Criteria: criteriaObject } : criteriaObject

  // Add cardinality (CRITICAL: use ?? not ||)
  // Atlas Occurrence.Type mapping: 0 = EXACTLY, 1 = AT_MOST, 2 = AT_LEAST
  if (event.cardinality) {
    atlasEvent.Occurrence = {
      Type: event.cardinality.type === 'EXACTLY' ? 0 :
            event.cardinality.type === 'AT_MOST' ? 1 :
            event.cardinality.type === 'AT_LEAST' ? 2 : 0,
      Count: event.cardinality.count ?? 1, // CRITICAL: ?? preserves 0
      CountMethod: event.cardinality.countingMethod || 'ALL',
      // US4: Extended cardinality attributes
      IsDistinct: event.cardinality.isDistinct ?? false,
    }
    // Only add CountColumn if it's present
    if (event.cardinality.countColumn) {
      atlasEvent.Occurrence.CountColumn = event.cardinality.countColumn
    }
  }

  // Add temporal windows
  if (event.temporalWindow) {
    if (event.temporalWindow.startWindow) {
      const startDays = event.temporalWindow.startWindow.days
      const endDays = event.temporalWindow.endWindow?.days

      atlasEvent.StartWindow = {
        Start: {
          // Only include Days if it's not null (null means "all time")
          ...(startDays !== null ? { Days: startDays } : {}),
          Coeff: event.temporalWindow.startWindow.beforeAfter === 'AFTER' ? 1 : -1,
        },
        End: event.temporalWindow.endWindow ? {
          // Only include Days if it's not null (null means "all time")
          ...(endDays !== null ? { Days: endDays } : {}),
          Coeff: event.temporalWindow.endWindow.beforeAfter === 'AFTER' ? 1 : -1,
        } : undefined,
        UseIndexEnd: event.temporalWindow.startWindow.referencePoint === 'INDEX_END',
        UseEventEnd: event.temporalWindow.startWindow.referencePoint === 'EVENT_END',
      }
    }
  }

  // US4: Add DateAdjustment conversion
  if (event.dateAdjustment) {
    atlasEvent.DateAdjustment = {
      StartWith: event.dateAdjustment.startWith,
      StartOffset: event.dateAdjustment.startOffset,
      EndWith: event.dateAdjustment.endWith,
      EndOffset: event.dateAdjustment.endOffset,
    }
  }

  // Add required flags for InclusionRules
  if (wrapInCriteria) {
    atlasEvent.RestrictVisit = event.restrictVisit ?? false
    atlasEvent.IgnoreObservationPeriod = event.ignoreObservationPeriod ?? false
  }

  // Convert nested criteria to Atlas CorrelatedCriteria structure
  if (event.nestedCriteria) {
    atlasEvent.CorrelatedCriteria = {
      Type: event.nestedCriteria.logicType,
      Count: event.nestedCriteria.count,
      CriteriaList: event.nestedCriteria.events.map(e => convertEventToAtlas(e, true)),
      DemographicCriteriaList: [],
      Groups: []
    }
  }

  return atlasEvent
}

/**
 * Helper: Convert text attribute to Atlas format
 * Atlas format: Direct string value at attribute name key
 * Example: { StopReason: "patient request" }
 */
function convertTextAttribute(attributeKey: string, value: string): Record<string, string> {
  const attributeName = convertToPascalCase(attributeKey)
  return { [attributeName]: value }
}

/**
 * Helper: Parse text attribute from Atlas format
 * @param attributeKey The attribute name in camelCase
 * @param value The string value from Atlas JSON
 * @returns Internal TextAttribute format
 */
export function parseTextAttribute(attributeKey: string, value: string): EventAttribute {
  return {
    type: 'text',
    attributeKey: attributeKey as 'valueAsString',
    operator: 'CONTAINS', // Default operator - can be refined based on attribute config
    value,
  }
}

/**
 * Helper: Convert boolean attribute to Atlas format
 * Atlas format: Direct boolean value at attribute name key
 * Example: { First: true }
 */
function convertBooleanAttribute(attributeKey: string, value: boolean): Record<string, boolean> {
  const attributeName = convertToPascalCase(attributeKey)
  return { [attributeName]: value }
}

/**
 * Helper: Parse boolean attribute from Atlas format
 * @param attributeKey The attribute name in camelCase
 * @param value The boolean value from Atlas JSON
 * @returns Internal BooleanAttribute format
 */
export function parseBooleanAttribute(attributeKey: string, value: boolean): EventAttribute {
  return {
    type: 'boolean',
    attributeKey: attributeKey as 'first',
    value,
  }
}

/**
 * Helper: Convert concept attribute to Atlas format
 * Atlas format: Array of concept objects
 * Example: { Gender: [{ CONCEPT_ID: 8532, CONCEPT_NAME: "Female" }, { CONCEPT_ID: 8507, CONCEPT_NAME: "Male" }] }
 */
function convertConceptAttribute(attributeKey: string, concepts: unknown[]): Record<string, unknown[]> {
  const attributeName = convertToPascalCase(attributeKey)
  return { [attributeName]: concepts }
}

/**
 * Helper: Parse concept attribute from Atlas format
 * @param attributeKey The attribute name in camelCase
 * @param concepts Array of concept objects from Atlas JSON
 * @returns Internal ConceptAttribute format
 */
export function parseConceptAttribute(attributeKey: string, concepts: unknown[]): EventAttribute {
  return {
    type: 'concept',
    attributeKey: attributeKey as 'gender',
    concepts: (concepts as import('@/models/event.types').Concept[]) || [],
  }
}

/**
 * Helper: Convert temporal relationship attribute to Atlas format
 * Atlas format: Nested StartWindow object with Start/End and reference point flags
 * Example: { TemporalRelationship: { StartWindow: { Start: {...}, End: {...} } } }
 */
function convertTemporalRelationshipAttribute(attributeKey: string, temporalWindow: {
  startWindow?: {
    days: number | null
    beforeAfter: 'BEFORE' | 'AFTER'
    referencePoint: string
  }
  endWindow?: {
    days: number | null
    beforeAfter: 'BEFORE' | 'AFTER'
    referencePoint: string
  }
}): Record<string, unknown> {
  const attributeName = convertToPascalCase(attributeKey)
  const atlasWindow: Record<string, unknown> = {}

  if (temporalWindow.startWindow) {
    const startDays = temporalWindow.startWindow.days
    const endDays = temporalWindow.endWindow?.days

    atlasWindow.StartWindow = {
      Start: {
        ...(startDays !== null ? { Days: startDays } : {}),
        Coeff: temporalWindow.startWindow.beforeAfter === 'AFTER' ? 1 : -1,
      },
      End: temporalWindow.endWindow ? {
        ...(endDays !== null ? { Days: endDays } : {}),
        Coeff: temporalWindow.endWindow.beforeAfter === 'AFTER' ? 1 : -1,
      } : undefined,
      UseIndexEnd: temporalWindow.startWindow.referencePoint === 'INDEX_END',
      UseEventEnd: temporalWindow.startWindow.referencePoint === 'EVENT_END',
    }
  }

  return { [attributeName]: atlasWindow }
}

/**
 * Helper: Parse temporal relationship attribute from Atlas format
 * @param attributeKey The attribute name in camelCase
 * @param temporalWindowData The temporal window data from Atlas JSON
 * @returns Internal TemporalRelationshipAttribute format
 */
export function parseTemporalRelationshipAttribute(attributeKey: string, temporalWindowData: {
  StartWindow?: {
    Start?: { Days?: number; Coeff?: number }
    End?: { Days?: number; Coeff?: number }
    UseIndexEnd?: boolean
    UseEventEnd?: boolean
  }
}): EventAttribute {
  return {
    type: 'temporalRelationship',
    attributeKey: attributeKey as 'temporalRelationship',
    temporalWindow: {
      startWindow: temporalWindowData.StartWindow?.Start ? {
        days: temporalWindowData.StartWindow.Start.Days !== undefined ? temporalWindowData.StartWindow.Start.Days : null,
        beforeAfter: (temporalWindowData.StartWindow.Start.Coeff ?? 1) < 0 ? 'BEFORE' : 'AFTER',
        referencePoint: temporalWindowData.StartWindow.UseIndexEnd ? 'INDEX_END' :
                       temporalWindowData.StartWindow.UseEventEnd ? 'EVENT_END' : 'INDEX_START',
      } : undefined,
      endWindow: temporalWindowData.StartWindow?.End ? {
        days: temporalWindowData.StartWindow.End.Days !== undefined ? temporalWindowData.StartWindow.End.Days : null,
        beforeAfter: (temporalWindowData.StartWindow.End.Coeff ?? 1) < 0 ? 'BEFORE' : 'AFTER',
        referencePoint: temporalWindowData.StartWindow.UseIndexEnd ? 'INDEX_END' :
                       temporalWindowData.StartWindow.UseEventEnd ? 'EVENT_END' : 'INDEX_START',
      } : undefined,
    }
  }
}

/**
 * Helper: Convert date adjustment attribute to Atlas format
 * Atlas format: DateAdjustment object with StartWith, StartOffset, EndWith, EndOffset
 * Example: { DateAdjustment: { StartWith: "START_DATE", StartOffset: 0, EndWith: "END_DATE", EndOffset: 30 } }
 */
function convertDateAdjustmentAttribute(attributeKey: string, dateAdjustment: {
  startWith: string
  startOffset: number
  endWith: string
  endOffset: number
}): Record<string, unknown> {
  const attributeName = convertToPascalCase(attributeKey)
  return {
    [attributeName]: {
      StartWith: dateAdjustment.startWith,
      StartOffset: dateAdjustment.startOffset,
      EndWith: dateAdjustment.endWith,
      EndOffset: dateAdjustment.endOffset,
    }
  }
}

/**
 * Helper: Parse date adjustment attribute from Atlas format
 * @param attributeKey The attribute name in camelCase
 * @param dateAdjustmentData The date adjustment data from Atlas JSON
 * @returns Internal DateAdjustmentAttribute format
 */
export function parseDateAdjustmentAttribute(attributeKey: string, dateAdjustmentData: {
  StartWith?: string
  StartOffset?: number
  EndWith?: string
  EndOffset?: number
}): EventAttribute {
  return {
    type: 'dateAdjustment',
    attributeKey: attributeKey as 'dateAdjustment',
    dateAdjustment: {
      startWith: (dateAdjustmentData.StartWith as 'START_DATE' | 'END_DATE') || 'START_DATE',
      startOffset: dateAdjustmentData.StartOffset || 0,
      endWith: (dateAdjustmentData.EndWith as 'START_DATE' | 'END_DATE') || 'END_DATE',
      endOffset: dateAdjustmentData.EndOffset || 0,
    }
  }
}

/**
 * Helper: Convert user defined period attribute to Atlas format
 * Atlas format: PeriodStartDate and PeriodEndDate as separate fields
 * Example: { PeriodStartDate: "2020-01-01", PeriodEndDate: "2020-12-31" }
 */
function convertUserDefinedPeriodAttribute(_attributeKey: string, period: {
  startDate: string
  endDate: string
}): Record<string, string> {
  return {
    PeriodStartDate: period.startDate,
    PeriodEndDate: period.endDate,
  }
}

/**
 * Helper: Parse user defined period attribute from Atlas format
 * @param attributeKey The attribute name in camelCase
 * @param startDate The period start date from Atlas JSON
 * @param endDate The period end date from Atlas JSON
 * @returns Internal UserDefinedPeriodAttribute format
 */
export function parseUserDefinedPeriodAttribute(attributeKey: string, startDate: string, endDate: string): EventAttribute {
  return {
    type: 'userDefinedPeriod',
    attributeKey: attributeKey as 'userDefinedPeriod',
    period: {
      startDate,
      endDate,
    }
  }
}

/**
 * Convert internal attribute to Atlas format
 * Maps camelCase to PascalCase and returns object with attribute as property
 * For example: { age: { operator: 'gte', value: 18 } } becomes { Age: { Op: 'gte', Value: 18 } }
 */
function convertAttributeToAtlas(attr: EventAttribute): Record<string, unknown> {
  // Handle null/undefined attributes gracefully
  if (!attr || typeof attr !== 'object' || !attr.type) {
    return {}
  }

  if (attr.type === 'numericRange' || attr.type === 'dateRange') {
    const attributeName = convertToPascalCase(attr.attributeKey)
    const result: Record<string, { Op: string; Value: unknown; Extent?: unknown }> = {
      [attributeName]: {
        Op: convertOperatorToAtlas(attr.operator),
        Value: attr.value,
      }
    }
    // Only add Extent if it exists
    if (attr.extent !== undefined) {
      const attrValue = result[attributeName]
      if (attrValue && typeof attrValue === 'object') {
        attrValue.Extent = attr.extent
      }
    }
    return result
  } else if (attr.type === 'conceptSet') {
    // For concept sets like Gender, Race, etc.
    const attributeName = convertToPascalCase(attr.attributeKey)
    return { [attributeName]: attr.conceptSet }
  } else if (attr.type === 'concept') {
    return convertConceptAttribute(attr.attributeKey, attr.concepts)
  } else if (attr.type === 'boolean') {
    return convertBooleanAttribute(attr.attributeKey, attr.value)
  } else if (attr.type === 'text') {
    return convertTextAttribute(attr.attributeKey, attr.value)
  } else if (attr.type === 'temporalRelationship') {
    return convertTemporalRelationshipAttribute(attr.attributeKey, attr.temporalWindow)
  } else if (attr.type === 'dateAdjustment') {
    return convertDateAdjustmentAttribute(attr.attributeKey, attr.dateAdjustment)
  } else if (attr.type === 'userDefinedPeriod') {
    return convertUserDefinedPeriodAttribute(attr.attributeKey, attr.period)
  }

  return {}
}

/**
 * Convert Atlas JSON to internal format
 */
export function convertAtlasToInternal(atlas: AtlasJSON): Partial<CohortDefinition> {
  return {
    // Phase 1 attributes - preserve from Atlas
    expressionType: atlas.expressionType,
    cdmVersionRange: atlas.cdmVersionRange,
    collapseSettings: atlas.CollapseSettings ? {
      collapseType: atlas.CollapseSettings.CollapseType as 'ERA',
      eraPad: atlas.CollapseSettings.EraPad,
    } : undefined,
    censorWindow: atlas.CensorWindow && Object.keys(atlas.CensorWindow).length > 0
      ? convertPeriodFromAtlas(atlas.CensorWindow)
      : undefined,
    censoringCriteria: atlas.CensoringCriteria && atlas.CensoringCriteria.length > 0
      ? atlas.CensoringCriteria.map(e => convertAtlasToEvent(e, atlas.ConceptSets))
      : undefined,

    entryEvents: atlas.PrimaryCriteria?.CriteriaList?.map(e => convertAtlasToEvent(e, atlas.ConceptSets)) || [],
    observationPeriod: atlas.PrimaryCriteria?.ObservationWindow ? {
      priorDays: atlas.PrimaryCriteria.ObservationWindow.PriorDays,
      postDays: atlas.PrimaryCriteria.ObservationWindow.PostDays,
    } : undefined,
    qualifyingLimit: (atlas.QualifiedLimit?.Type?.toUpperCase() || 'ALL') as QualifyingLimit,
    inclusionQualifyingLimit: atlas.ExpressionLimit?.Type
      ? (atlas.ExpressionLimit.Type.toUpperCase() as QualifyingLimit)
      : undefined,
    // Parse AdditionalCriteria
    additionalCriteria: (atlas.AdditionalCriteria?.CriteriaList && atlas.AdditionalCriteria.CriteriaList.length > 0) ? {
      id: generateId(),
      logicType: (atlas.AdditionalCriteria.Type || 'ALL') as LogicType,
      qualifyingLimit: (atlas.PrimaryCriteria?.PrimaryCriteriaLimit?.Type?.toUpperCase() || 'ALL') as QualifyingLimit,
      events: atlas.AdditionalCriteria.CriteriaList.map((e: AtlasCriteria) => convertAtlasToEvent(e, atlas.ConceptSets)),
    } : undefined,
    inclusionRules: atlas.InclusionRules?.map((rule: AtlasInclusionRule) => {
      const criteriaGroups: import('@/models/cohort.types').CriteriaGroup[] = []

      // If there are criteria at the top level, create a default group
      if (rule.expression?.CriteriaList && rule.expression.CriteriaList.length > 0) {
        criteriaGroups.push({
          id: generateId(),
          logicType: (rule.expression.Type || 'ALL') as LogicType,
          events: rule.expression.CriteriaList.map((e: AtlasCriteria) => convertAtlasToEvent(e, atlas.ConceptSets)),
        })
      }

      // Handle DemographicCriteriaList - convert to events with attributes
      if (rule.expression?.DemographicCriteriaList && rule.expression.DemographicCriteriaList.length > 0) {
        const demographicEvents = (rule.expression.DemographicCriteriaList as Array<Record<string, unknown>>).map((dc) =>
          convertDemographicCriteriaToEvent(dc)
        )

        // Add to existing group or create a new one
        if (criteriaGroups.length > 0) {
          const firstGroup = criteriaGroups[0]
          if (firstGroup) {
            firstGroup.events.push(...demographicEvents)
          }
        } else {
          criteriaGroups.push({
            id: generateId(),
            logicType: (rule.expression.Type || 'ALL') as LogicType,
            events: demographicEvents,
          })
        }
      }

      // Add any nested groups
      if (rule.expression?.Groups && rule.expression.Groups.length > 0) {
        criteriaGroups.push(...rule.expression.Groups.map((group: import('@/models/atlas.types').AtlasGroup) => ({
          id: generateId(),
          logicType: (group.Type || 'ALL') as LogicType,
          events: group.CriteriaList?.map((e: AtlasCriteria) => convertAtlasToEvent(e, atlas.ConceptSets)) || [],
        })))
      }

      return {
        id: generateId(),
        name: rule.name || 'Unnamed Rule',
        description: rule.description || '',
        criteriaGroups,
      }
    }) || [],
    conceptSets: atlas.ConceptSets?.map(cs => ({
      id: cs.id,
      name: cs.name,
      items: cs.expression?.items?.map((item: AtlasConceptSetItem) => ({
        conceptId: item.concept.CONCEPT_ID,
        conceptName: item.concept.CONCEPT_NAME,
        domainId: item.concept.DOMAIN_ID,
        vocabularyId: item.concept.VOCABULARY_ID,
        conceptClassId: item.concept.CONCEPT_CLASS_ID,
        standardConcept: item.concept.STANDARD_CONCEPT,
        conceptCode: item.concept.CONCEPT_CODE,
        invalidReason: item.concept.INVALID_REASON,
        includeDescendants: item.includeDescendants ?? false,
        isExcluded: item.isExcluded ?? false,
        includeMapped: item.includeMapped ?? false,
      })) || [],
    })) || [],
  }
}

/**
 * Convert Atlas event to internal format
 */
function convertAtlasToEvent(atlasEvent: AtlasCriteria, conceptSets?: AtlasConceptSet[]): CohortEvent {
  // Extract criteria type and object
  // Note: PrimaryCriteria has NO "Criteria" wrapper, but InclusionRules DO have it
  let criteriaType: string
  let criteriaObj: Record<string, unknown>

  if (atlasEvent.Criteria) {
    // Has Criteria wrapper (InclusionRules, AdditionalCriteria)
    criteriaType = Object.keys(atlasEvent.Criteria)[0] || 'ConditionOccurrence'
    criteriaObj = (atlasEvent.Criteria as Record<string, Record<string, unknown>>)[criteriaType] || {}
  } else {
    // No Criteria wrapper (PrimaryCriteria)
    // The criteria type is a direct property on atlasEvent
    const possibleTypes = [
      'ConditionOccurrence', 'ConditionEra',
      'DrugExposure', 'DrugEra',
      'ProcedureOccurrence',
      'Observation',
      'VisitOccurrence', 'VisitDetail',
      'Measurement',
      'DeviceExposure',
      'Specimen',
      'Death',
      'ObservationPeriod',
      'PayerPlanPeriod',
      'LocationRegion',
    ]
    criteriaType = possibleTypes.find(t => (atlasEvent as Record<string, unknown>)[t]) || 'ConditionOccurrence'
    criteriaObj = ((atlasEvent as Record<string, unknown>)[criteriaType] as Record<string, unknown>) || {}
  }

  // Look up concept set from the conceptSets array
  const codesetId = (criteriaObj.CodesetId as number | undefined) ?? 0
  const conceptSet = conceptSets?.find(cs => cs.id === codesetId)
  const conceptSetName = conceptSet?.name || `Concept Set ${codesetId}`

  const event: CohortEvent = {
    id: generateId(),
    criteriaType: criteriaType as CriteriaType,
    conceptSet: conceptSet ? {
      id: conceptSet.id,
      name: conceptSet.name,
      items: conceptSet.expression?.items?.map((item: { concept: AtlasConcept; includeDescendants?: boolean; isExcluded?: boolean; includeMapped?: boolean }) => ({
        conceptId: item.concept.CONCEPT_ID,
        conceptName: item.concept.CONCEPT_NAME,
        domainId: item.concept.DOMAIN_ID,
        vocabularyId: item.concept.VOCABULARY_ID,
        conceptClassId: item.concept.CONCEPT_CLASS_ID,
        standardConcept: item.concept.STANDARD_CONCEPT,
        conceptCode: item.concept.CONCEPT_CODE,
        invalidReason: item.concept.INVALID_REASON,
        includeDescendants: item.includeDescendants ?? false,
        isExcluded: item.isExcluded ?? false,
        includeMapped: item.includeMapped ?? false,
      })) || [],
    } : {
      id: codesetId,
      name: conceptSetName,
      items: [],
    },
    cardinality: (() => {
      interface AtlasEventWithOccurrence {
        Occurrence?: {
          Type?: number
          Count?: number
          CountMethod?: string
          IsDistinct?: boolean
          CountColumn?: string
        }
      }
      const eventWithOccurrence = atlasEvent as AtlasEventWithOccurrence
      if (!eventWithOccurrence.Occurrence) {
        return undefined
      }
      const occurrence = eventWithOccurrence.Occurrence
      return {
        type: occurrence.Type === 0 ? 'EXACTLY' :
              occurrence.Type === 1 ? 'AT_MOST' :
              occurrence.Type === 2 ? 'AT_LEAST' : 'EXACTLY',
        count: occurrence.Count ?? 1, // CRITICAL: ?? preserves 0
        countingMethod: (occurrence.CountMethod as import('@/models/event.types').CountingMethod) || 'ALL',
        // US4: Extended cardinality attributes
        isDistinct: occurrence.IsDistinct,
        countColumn: occurrence.CountColumn,
      }
    })(),
    attributes: [], // Will be populated below
  }

  // Extract attributes from the criteria object
  event.attributes = extractAttributesFromCriteria(criteriaObj)

  // Add temporal window if present
  // NOTE: Atlas format has StartWindow with nested Start/End, not separate StartWindow/EndWindow
  interface AtlasEventWithStartWindow {
    StartWindow?: {
      Start?: { Days?: number; Coeff?: number }
      End?: { Days?: number; Coeff?: number }
      UseIndexEnd?: boolean
      UseEventEnd?: boolean
    }
  }
  const eventWithStartWindow = atlasEvent as AtlasEventWithStartWindow
  const startWindow = eventWithStartWindow.StartWindow
  if (startWindow) {
    event.temporalWindow = {
      startWindow: startWindow.Start ? {
        // CRITICAL: Missing Days means "all time", not 0
        days: startWindow.Start.Days !== undefined ? startWindow.Start.Days : null,
        beforeAfter: (startWindow.Start.Coeff ?? 1) < 0 ? 'BEFORE' : 'AFTER',
        referencePoint: startWindow.UseIndexEnd ? 'INDEX_END' :
                       startWindow.UseEventEnd ? 'EVENT_END' : 'INDEX_START',
      } : undefined,
      endWindow: startWindow.End ? {
        // CRITICAL: Missing Days means "all time", not 0
        days: startWindow.End.Days !== undefined ? startWindow.End.Days : null,
        beforeAfter: (startWindow.End.Coeff ?? 1) < 0 ? 'BEFORE' : 'AFTER',
        referencePoint: startWindow.UseIndexEnd ? 'INDEX_END' :
                       startWindow.UseEventEnd ? 'EVENT_END' : 'INDEX_START',
      } : undefined,
    }
  }

  // Add optional flags
  interface AtlasEventWithFlags {
    RestrictVisit?: boolean
    IgnoreObservationPeriod?: boolean
  }
  const eventWithFlags = atlasEvent as AtlasEventWithFlags
  if (eventWithFlags.RestrictVisit !== undefined) {
    event.restrictVisit = eventWithFlags.RestrictVisit
  }
  if (eventWithFlags.IgnoreObservationPeriod !== undefined) {
    event.ignoreObservationPeriod = eventWithFlags.IgnoreObservationPeriod
  }

  // US4: Extract DateAdjustment
  interface AtlasEventWithDateAdjustment {
    DateAdjustment?: {
      StartWith: string
      StartOffset: number
      EndWith: string
      EndOffset: number
    }
  }
  const eventWithDateAdjustment = atlasEvent as AtlasEventWithDateAdjustment
  const dateAdjustment = eventWithDateAdjustment.DateAdjustment
  if (dateAdjustment) {
    event.dateAdjustment = {
      startWith: dateAdjustment.StartWith as 'START_DATE' | 'END_DATE',
      startOffset: dateAdjustment.StartOffset,
      endWith: dateAdjustment.EndWith as 'START_DATE' | 'END_DATE',
      endOffset: dateAdjustment.EndOffset,
    }
  }

  // Convert Atlas CorrelatedCriteria to nested criteria
  interface AtlasEventWithCorrelatedCriteria {
    CorrelatedCriteria?: {
      Type?: string
      Count?: number
      CriteriaList?: AtlasCriteria[]
    }
  }
  const eventWithCorrelatedCriteria = atlasEvent as AtlasEventWithCorrelatedCriteria
  const correlatedCriteria = eventWithCorrelatedCriteria.CorrelatedCriteria
  if (correlatedCriteria) {
    event.nestedCriteria = {
      id: generateId(),
      logicType: (correlatedCriteria.Type as LogicType) || 'ALL',
      count: correlatedCriteria.Count,
      events: correlatedCriteria.CriteriaList?.map((e: AtlasCriteria) => convertAtlasToEvent(e, conceptSets)) || []
    }
  }

  return event
}

/**
 * Convert DemographicCriteria to a pseudo-event for rendering
 * DemographicCriteria doesn't have a CodesetId, so we create a special event type
 */
function convertDemographicCriteriaToEvent(demographicCriteria: Record<string, unknown>): CohortEvent {
  const event: CohortEvent = {
    id: generateId(),
    criteriaType: 'ConditionOccurrence', // Use as placeholder
    conceptSet: {
      id: 0,
      name: 'Demographics',
    },
    attributes: extractAttributesFromCriteria(demographicCriteria),
  }

  return event
}

/**
 * Extract attributes from a criteria object (handles Age, Gender, etc.)
 */
function extractAttributesFromCriteria(criteriaObj: Record<string, unknown>): EventAttribute[] {
  const attributes: EventAttribute[] = []

  // Age - NumericRange
  if (criteriaObj.Age && typeof criteriaObj.Age === 'object' && criteriaObj.Age !== null) {
    const age = criteriaObj.Age as { Op: string; Value: number; Extent?: number }
    attributes.push({
      type: 'numericRange',
      attributeKey: 'age',
      operator: convertAtlasToOperator(age.Op) as import('@/models/event.types').NumericOperator,
      value: age.Value,
      extent: age.Extent,
    })
  }

  // AgeAtStart - NumericRange (for Eras)
  if (criteriaObj.AgeAtStart && typeof criteriaObj.AgeAtStart === 'object' && criteriaObj.AgeAtStart !== null) {
    const ageAtStart = criteriaObj.AgeAtStart as { Op: string; Value: number; Extent?: number }
    attributes.push({
      type: 'numericRange',
      attributeKey: 'age',
      operator: convertAtlasToOperator(ageAtStart.Op) as import('@/models/event.types').NumericOperator,
      value: ageAtStart.Value,
      extent: ageAtStart.Extent,
    })
  }

  // Gender - ConceptSet
  if (criteriaObj.Gender && Array.isArray(criteriaObj.Gender) && criteriaObj.Gender.length > 0) {
    attributes.push({
      type: 'conceptSet',
      attributeKey: 'gender',
      conceptSet: {
        id: 'gender-concepts',
        name: criteriaObj.Gender.map((c: { CONCEPT_NAME?: string }) => c.CONCEPT_NAME || 'Unknown').join(', '),
      },
    })
  }

  // Race - ConceptSet
  if (criteriaObj.Race && Array.isArray(criteriaObj.Race) && criteriaObj.Race.length > 0) {
    attributes.push({
      type: 'conceptSet',
      attributeKey: 'race',
      conceptSet: {
        id: 'race-concepts',
        name: criteriaObj.Race.map((c: { CONCEPT_NAME?: string }) => c.CONCEPT_NAME || 'Unknown').join(', '),
      },
    })
  }

  // Ethnicity - ConceptSet
  if (criteriaObj.Ethnicity && Array.isArray(criteriaObj.Ethnicity) && criteriaObj.Ethnicity.length > 0) {
    attributes.push({
      type: 'conceptSet',
      attributeKey: 'race', // Map to race for now
      conceptSet: {
        id: 'ethnicity-concepts',
        name: criteriaObj.Ethnicity.map((c: { CONCEPT_NAME?: string }) => c.CONCEPT_NAME || 'Unknown').join(', '),
      },
    })
  }

  // ValueAsNumber - NumericRange
  if (criteriaObj.ValueAsNumber && typeof criteriaObj.ValueAsNumber === 'object' && criteriaObj.ValueAsNumber !== null) {
    const valueAsNumber = criteriaObj.ValueAsNumber as { Op: string; Value: number; Extent?: number }
    attributes.push({
      type: 'numericRange',
      attributeKey: 'valueAsNumber',
      operator: convertAtlasToOperator(valueAsNumber.Op) as import('@/models/event.types').NumericOperator,
      value: valueAsNumber.Value,
      extent: valueAsNumber.Extent,
    })
  }

  // ValueAsString - Text
  if (typeof criteriaObj.ValueAsString === 'string') {
    attributes.push({
      type: 'text',
      attributeKey: 'valueAsString',
      operator: 'CONTAINS',
      value: criteriaObj.ValueAsString,
    })
  }

  // OccurrenceStartDate - DateRange
  if (criteriaObj.OccurrenceStartDate && typeof criteriaObj.OccurrenceStartDate === 'object' && criteriaObj.OccurrenceStartDate !== null) {
    const occurrenceStartDate = criteriaObj.OccurrenceStartDate as { Op: string; Value: string; Extent?: string }
    attributes.push({
      type: 'dateRange',
      attributeKey: 'occurrenceStartDate',
      operator: convertAtlasToOperator(occurrenceStartDate.Op) as import('@/models/event.types').DateOperator,
      value: occurrenceStartDate.Value,
      extent: occurrenceStartDate.Extent,
    })
  }

  // OccurrenceEndDate - DateRange
  if (criteriaObj.OccurrenceEndDate && typeof criteriaObj.OccurrenceEndDate === 'object' && criteriaObj.OccurrenceEndDate !== null) {
    const occurrenceEndDate = criteriaObj.OccurrenceEndDate as { Op: string; Value: string; Extent?: string }
    attributes.push({
      type: 'dateRange',
      attributeKey: 'occurrenceEndDate',
      operator: convertAtlasToOperator(occurrenceEndDate.Op) as import('@/models/event.types').DateOperator,
      value: occurrenceEndDate.Value,
      extent: occurrenceEndDate.Extent,
    })
  }

  // EraStartDate - DateRange
  if (criteriaObj.EraStartDate && typeof criteriaObj.EraStartDate === 'object' && criteriaObj.EraStartDate !== null) {
    const eraStartDate = criteriaObj.EraStartDate as { Op: string; Value: string; Extent?: string }
    attributes.push({
      type: 'dateRange',
      attributeKey: 'eraStartDate',
      operator: convertAtlasToOperator(eraStartDate.Op) as import('@/models/event.types').DateOperator,
      value: eraStartDate.Value,
      extent: eraStartDate.Extent,
    })
  }

  // EraEndDate - DateRange
  if (criteriaObj.EraEndDate && typeof criteriaObj.EraEndDate === 'object' && criteriaObj.EraEndDate !== null) {
    const eraEndDate = criteriaObj.EraEndDate as { Op: string; Value: string; Extent?: string }
    attributes.push({
      type: 'dateRange',
      attributeKey: 'eraEndDate',
      operator: convertAtlasToOperator(eraEndDate.Op) as import('@/models/event.types').DateOperator,
      value: eraEndDate.Value,
      extent: eraEndDate.Extent,
    })
  }

  // VisitLength - NumericRange
  if (criteriaObj.VisitLength && typeof criteriaObj.VisitLength === 'object' && criteriaObj.VisitLength !== null) {
    const visitLength = criteriaObj.VisitLength as { Op: string; Value: number; Extent?: number }
    attributes.push({
      type: 'numericRange',
      attributeKey: 'visitLength',
      operator: convertAtlasToOperator(visitLength.Op) as import('@/models/event.types').NumericOperator,
      value: visitLength.Value,
      extent: visitLength.Extent,
    })
  }

  // EraLength - NumericRange
  if (criteriaObj.EraLength && typeof criteriaObj.EraLength === 'object' && criteriaObj.EraLength !== null) {
    const eraLength = criteriaObj.EraLength as { Op: string; Value: number; Extent?: number }
    attributes.push({
      type: 'numericRange',
      attributeKey: 'eraLength',
      operator: convertAtlasToOperator(eraLength.Op) as import('@/models/event.types').NumericOperator,
      value: eraLength.Value,
      extent: eraLength.Extent,
    })
  }

  // Quantity - NumericRange
  if (criteriaObj.Quantity && typeof criteriaObj.Quantity === 'object' && criteriaObj.Quantity !== null) {
    const quantity = criteriaObj.Quantity as { Op: string; Value: number; Extent?: number }
    attributes.push({
      type: 'numericRange',
      attributeKey: 'quantity',
      operator: convertAtlasToOperator(quantity.Op) as import('@/models/event.types').NumericOperator,
      value: quantity.Value,
      extent: quantity.Extent,
    })
  }

  // VisitType - ConceptSet
  if (criteriaObj.VisitType && Array.isArray(criteriaObj.VisitType) && criteriaObj.VisitType.length > 0) {
    attributes.push({
      type: 'conceptSet',
      attributeKey: 'visitType',
      conceptSet: {
        id: 'visit-type-concepts',
        name: criteriaObj.VisitType.map((c: { CONCEPT_NAME?: string }) => c.CONCEPT_NAME || 'Unknown').join(', '),
      },
    })
  }

  // ProviderSpecialty - ConceptSet
  if (criteriaObj.ProviderSpecialty && Array.isArray(criteriaObj.ProviderSpecialty) && criteriaObj.ProviderSpecialty.length > 0) {
    attributes.push({
      type: 'conceptSet',
      attributeKey: 'providerSpecialty',
      conceptSet: {
        id: 'provider-specialty-concepts',
        name: criteriaObj.ProviderSpecialty.map((c: { CONCEPT_NAME?: string }) => c.CONCEPT_NAME || 'Unknown').join(', '),
      },
    })
  }

  // First - Boolean
  if (typeof criteriaObj.First === 'boolean') {
    attributes.push({
      type: 'boolean',
      attributeKey: 'first',
      value: criteriaObj.First,
    })
  }

  // TemporalRelationship - TemporalWindow attribute
  if (criteriaObj.TemporalRelationship && typeof criteriaObj.TemporalRelationship === 'object' && criteriaObj.TemporalRelationship !== null) {
    const temporalRelationship = criteriaObj.TemporalRelationship as { StartWindow?: unknown }
    if (temporalRelationship.StartWindow) {
      attributes.push(parseTemporalRelationshipAttribute('temporalRelationship', temporalRelationship as Parameters<typeof parseTemporalRelationshipAttribute>[1]))
    }
  }

  // DateAdjustment - Date adjustment attribute
  if (criteriaObj.DateAdjustment && typeof criteriaObj.DateAdjustment === 'object' && criteriaObj.DateAdjustment !== null) {
    const dateAdjustment = criteriaObj.DateAdjustment as { StartWith?: string }
    if (dateAdjustment.StartWith) {
      attributes.push(parseDateAdjustmentAttribute('dateAdjustment', dateAdjustment as Parameters<typeof parseDateAdjustmentAttribute>[1]))
    }
  }

  // UserDefinedPeriod - Custom period with start and end dates
  if (typeof criteriaObj.PeriodStartDate === 'string' && typeof criteriaObj.PeriodEndDate === 'string') {
    attributes.push(parseUserDefinedPeriodAttribute('userDefinedPeriod', criteriaObj.PeriodStartDate, criteriaObj.PeriodEndDate))
  }

  return attributes
}

/**
 * Convert Atlas operator to internal format
 */
function convertAtlasToOperator(atlasOp: string): string {
  const map: Record<string, string> = {
    gt: 'GREATER_THAN',
    gte: 'GREATER_THAN_OR_EQUAL',
    lt: 'LESS_THAN',
    lte: 'LESS_THAN_OR_EQUAL',
    eq: 'EQUAL',
    '!eq': 'NOT_EQUAL',
    bt: 'BETWEEN',
    '!bt': 'NOT_BETWEEN',
  }
  return map[atlasOp] || 'EQUAL'
}

/**
 * Convert internal Period to Atlas format
 */
function convertPeriodToAtlas(period: Period): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  if (period.startDate) {
    result.StartDate = convertDateFieldToAtlas(period.startDate)
  }

  if (period.endDate) {
    result.EndDate = convertDateFieldToAtlas(period.endDate)
  }

  return result
}

/**
 * Convert internal DateField to Atlas format
 */
function convertDateFieldToAtlas(dateField: DateField): Record<string, unknown> {
  return {
    DateField: dateField.dateField,
    Offset: dateField.offset ?? 0,
  }
}

/**
 * Convert Atlas Period to internal format
 */
function convertPeriodFromAtlas(atlasPeriod: Record<string, unknown>): Period {
  const period: Period = {}

  if (atlasPeriod.StartDate) {
    period.startDate = convertDateFieldFromAtlas(atlasPeriod.StartDate as { DateField: string; Offset: number })
  }

  if (atlasPeriod.EndDate) {
    period.endDate = convertDateFieldFromAtlas(atlasPeriod.EndDate as { DateField: string; Offset: number })
  }

  return period
}

/**
 * Convert Atlas DateField to internal format
 */
function convertDateFieldFromAtlas(atlasDateField: { DateField: string; Offset: number }): DateField {
  return {
    dateField: atlasDateField.DateField as 'START_DATE' | 'END_DATE',
    offset: atlasDateField.Offset,
  }
}

// Helpers
function convertToPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Capitalize first letter and lowercase the rest
 * Converts: "FIRST" -> "First", "ALL" -> "All", "LAST" -> "Last"
 */
function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
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
