/**
 * Atlas JSON Converter Service
 * Bidirectional conversion between internal cohort format and OHDSI Atlas JSON
 *
 * CRITICAL: Uses ?? operator for zero-count preservation (not ||)
 */

import type { CohortDefinition, CohortEvent, CriteriaType, Period, DateField } from '@/models/cohort.types'
import type { EventAttribute } from '@/models/event.types'

// Atlas JSON types (complete)
interface AtlasJSON {
  expressionType?: string
  cdmVersionRange?: string
  ConceptSets: any[]
  PrimaryCriteria: {
    CriteriaList: any[]
    ObservationWindow?: { PriorDays: number; PostDays: number }
    PrimaryCriteriaLimit?: { Type: string }
  }
  AdditionalCriteria?: {
    Type: string
    CriteriaList: any[]
    DemographicCriteriaList: any[]
    Groups: any[]
  }
  InclusionRules?: any[]
  CensoringCriteria?: any[]
  QualifiedLimit?: { Type: string }
  ExpressionLimit?: { Type: string }
  CollapseSettings?: {
    CollapseType: string
    EraPad: number
  }
  CensorWindow?: any
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
        items: cs.items?.map((item: any) => {
          const concept: any = {
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
function convertEventToAtlas(event: CohortEvent, wrapInCriteria: boolean = false): any {
  // Build the criteria object with CodesetId and attributes
  const criteriaTypeObj: any = {
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

  const criteriaObject: any = {
    [event.criteriaType]: criteriaTypeObj,
  }

  const atlasEvent: any = wrapInCriteria ? { Criteria: criteriaObject } : criteriaObject

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
function convertTextAttribute(attributeKey: string, value: string): any {
  const attributeName = convertToPascalCase(attributeKey)
  return { [attributeName]: value }
}

/**
 * Helper: Parse text attribute from Atlas format
 * @param attributeKey The attribute name in camelCase
 * @param value The string value from Atlas JSON
 * @returns Internal TextAttribute format
 */
export function parseTextAttribute(attributeKey: string, value: string): any {
  return {
    type: 'text',
    attributeKey,
    operator: 'CONTAINS', // Default operator - can be refined based on attribute config
    value,
  }
}

/**
 * Helper: Convert boolean attribute to Atlas format
 * Atlas format: Direct boolean value at attribute name key
 * Example: { First: true }
 */
function convertBooleanAttribute(attributeKey: string, value: boolean): any {
  const attributeName = convertToPascalCase(attributeKey)
  return { [attributeName]: value }
}

/**
 * Helper: Parse boolean attribute from Atlas format
 * @param attributeKey The attribute name in camelCase
 * @param value The boolean value from Atlas JSON
 * @returns Internal BooleanAttribute format
 */
export function parseBooleanAttribute(attributeKey: string, value: boolean): any {
  return {
    type: 'boolean',
    attributeKey,
    value,
  }
}

/**
 * Helper: Convert concept attribute to Atlas format
 * Atlas format: Array of concept objects
 * Example: { Gender: [{ CONCEPT_ID: 8532, CONCEPT_NAME: "Female" }, { CONCEPT_ID: 8507, CONCEPT_NAME: "Male" }] }
 */
function convertConceptAttribute(attributeKey: string, concepts: any[]): any {
  const attributeName = convertToPascalCase(attributeKey)
  return { [attributeName]: concepts }
}

/**
 * Helper: Parse concept attribute from Atlas format
 * @param attributeKey The attribute name in camelCase
 * @param concepts Array of concept objects from Atlas JSON
 * @returns Internal ConceptAttribute format
 */
export function parseConceptAttribute(attributeKey: string, concepts: any[]): any {
  return {
    type: 'concept',
    attributeKey,
    concepts: concepts || [],
  }
}

/**
 * Helper: Convert temporal relationship attribute to Atlas format
 * Atlas format: Nested StartWindow object with Start/End and reference point flags
 * Example: { TemporalRelationship: { StartWindow: { Start: {...}, End: {...} } } }
 */
function convertTemporalRelationshipAttribute(attributeKey: string, temporalWindow: any): any {
  const attributeName = convertToPascalCase(attributeKey)
  const atlasWindow: any = {}

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
export function parseTemporalRelationshipAttribute(attributeKey: string, temporalWindowData: any): any {
  return {
    type: 'temporalRelationship',
    attributeKey,
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
function convertDateAdjustmentAttribute(attributeKey: string, dateAdjustment: any): any {
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
export function parseDateAdjustmentAttribute(attributeKey: string, dateAdjustmentData: any): any {
  return {
    type: 'dateAdjustment',
    attributeKey,
    dateAdjustment: {
      startWith: dateAdjustmentData.StartWith || 'START_DATE',
      startOffset: dateAdjustmentData.StartOffset || 0,
      endWith: dateAdjustmentData.EndWith || 'END_DATE',
      endOffset: dateAdjustmentData.EndOffset || 0,
    }
  }
}

/**
 * Helper: Convert user defined period attribute to Atlas format
 * Atlas format: PeriodStartDate and PeriodEndDate as separate fields
 * Example: { PeriodStartDate: "2020-01-01", PeriodEndDate: "2020-12-31" }
 */
function convertUserDefinedPeriodAttribute(_attributeKey: string, period: any): any {
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
export function parseUserDefinedPeriodAttribute(attributeKey: string, startDate: string, endDate: string): any {
  return {
    type: 'userDefinedPeriod',
    attributeKey,
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
function convertAttributeToAtlas(attr: EventAttribute): any {
  // Handle null/undefined attributes gracefully
  if (!attr || typeof attr !== 'object' || !attr.type) {
    return {}
  }

  if (attr.type === 'numericRange' || attr.type === 'dateRange') {
    const attributeName = convertToPascalCase(attr.attributeKey)
    const result: any = {
      [attributeName]: {
        Op: convertOperatorToAtlas(attr.operator),
        Value: attr.value,
      }
    }
    // Only add Extent if it exists
    if (attr.extent !== undefined) {
      result[attributeName].Extent = attr.extent
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
      collapseType: atlas.CollapseSettings.CollapseType,
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
    qualifyingLimit: (atlas.QualifiedLimit?.Type?.toUpperCase() || 'ALL') as any,
    inclusionQualifyingLimit: atlas.ExpressionLimit?.Type
      ? (atlas.ExpressionLimit.Type.toUpperCase() as any)
      : undefined,
    // Parse AdditionalCriteria
    additionalCriteria: (atlas.AdditionalCriteria?.CriteriaList && atlas.AdditionalCriteria.CriteriaList.length > 0) ? {
      id: generateId(),
      logicType: (atlas.AdditionalCriteria.Type || 'ALL') as any,
      qualifyingLimit: (atlas.PrimaryCriteria?.PrimaryCriteriaLimit?.Type?.toUpperCase() || 'ALL') as any,
      events: atlas.AdditionalCriteria.CriteriaList.map((e: any) => convertAtlasToEvent(e, atlas.ConceptSets)),
    } : undefined,
    inclusionRules: atlas.InclusionRules?.map((rule: any) => {
      const criteriaGroups: any[] = []
      
      // If there are criteria at the top level, create a default group
      if (rule.expression?.CriteriaList && rule.expression.CriteriaList.length > 0) {
        criteriaGroups.push({
          id: generateId(),
          logicType: rule.expression.Type || 'ALL',
          events: rule.expression.CriteriaList.map((e: any) => convertAtlasToEvent(e, atlas.ConceptSets)),
        })
      }
      
      // Handle DemographicCriteriaList - convert to events with attributes
      if (rule.expression?.DemographicCriteriaList && rule.expression.DemographicCriteriaList.length > 0) {
        const demographicEvents = rule.expression.DemographicCriteriaList.map((dc: any) => 
          convertDemographicCriteriaToEvent(dc)
        )
        
        // Add to existing group or create a new one
        if (criteriaGroups.length > 0) {
          criteriaGroups[0].events.push(...demographicEvents)
        } else {
          criteriaGroups.push({
            id: generateId(),
            logicType: rule.expression.Type || 'ALL',
            events: demographicEvents,
          })
        }
      }
      
      // Add any nested groups
      if (rule.expression?.Groups && rule.expression.Groups.length > 0) {
        criteriaGroups.push(...rule.expression.Groups.map((group: any) => ({
          id: generateId(),
          logicType: group.Type || 'ALL',
          events: group.CriteriaList?.map((e: any) => convertAtlasToEvent(e, atlas.ConceptSets)) || [],
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
      items: cs.expression?.items?.map((item: any) => ({
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
function convertAtlasToEvent(atlasEvent: any, conceptSets?: any[]): CohortEvent {
  // Extract criteria type and object
  // Note: PrimaryCriteria has NO "Criteria" wrapper, but InclusionRules DO have it
  let criteriaType: string
  let criteriaObj: any

  if (atlasEvent.Criteria) {
    // Has Criteria wrapper (InclusionRules, AdditionalCriteria)
    criteriaType = Object.keys(atlasEvent.Criteria)[0] as any
    criteriaObj = atlasEvent.Criteria[criteriaType]
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
    criteriaType = possibleTypes.find(t => atlasEvent[t]) || 'ConditionOccurrence'
    criteriaObj = atlasEvent[criteriaType] || {}
  }

  // Look up concept set from the conceptSets array
  const codesetId = criteriaObj.CodesetId ?? 0
  const conceptSet = conceptSets?.find(cs => cs.id === codesetId)
  const conceptSetName = conceptSet?.name || `Concept Set ${codesetId}`

  const event: CohortEvent = {
    id: generateId(),
    criteriaType: criteriaType as CriteriaType,
    conceptSet: conceptSet ? {
      id: conceptSet.id,
      name: conceptSet.name,
      items: conceptSet.expression?.items?.map((item: any) => ({
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
    cardinality: atlasEvent.Occurrence ? {
      type: atlasEvent.Occurrence.Type === 0 ? 'EXACTLY' :
            atlasEvent.Occurrence.Type === 1 ? 'AT_MOST' :
            atlasEvent.Occurrence.Type === 2 ? 'AT_LEAST' : 'EXACTLY',
      count: atlasEvent.Occurrence.Count ?? 1, // CRITICAL: ?? preserves 0
      countingMethod: atlasEvent.Occurrence.CountMethod || 'ALL',
      // US4: Extended cardinality attributes
      isDistinct: atlasEvent.Occurrence.IsDistinct,
      countColumn: atlasEvent.Occurrence.CountColumn,
    } : undefined,
    attributes: [], // Will be populated below
  }

  // Extract attributes from the criteria object
  event.attributes = extractAttributesFromCriteria(criteriaObj)

  // Add temporal window if present
  // NOTE: Atlas format has StartWindow with nested Start/End, not separate StartWindow/EndWindow
  if (atlasEvent.StartWindow) {
    event.temporalWindow = {
      startWindow: atlasEvent.StartWindow.Start ? {
        // CRITICAL: Missing Days means "all time", not 0
        days: atlasEvent.StartWindow.Start.Days !== undefined ? atlasEvent.StartWindow.Start.Days : null,
        beforeAfter: (atlasEvent.StartWindow.Start.Coeff ?? 1) < 0 ? 'BEFORE' : 'AFTER',
        referencePoint: atlasEvent.StartWindow.UseIndexEnd ? 'INDEX_END' :
                       atlasEvent.StartWindow.UseEventEnd ? 'EVENT_END' : 'INDEX_START',
      } : undefined,
      endWindow: atlasEvent.StartWindow.End ? {
        // CRITICAL: Missing Days means "all time", not 0
        days: atlasEvent.StartWindow.End.Days !== undefined ? atlasEvent.StartWindow.End.Days : null,
        beforeAfter: (atlasEvent.StartWindow.End.Coeff ?? 1) < 0 ? 'BEFORE' : 'AFTER',
        referencePoint: atlasEvent.StartWindow.UseIndexEnd ? 'INDEX_END' :
                       atlasEvent.StartWindow.UseEventEnd ? 'EVENT_END' : 'INDEX_START',
      } : undefined,
    }
  }

  // Add optional flags
  if (atlasEvent.RestrictVisit !== undefined) {
    event.restrictVisit = atlasEvent.RestrictVisit
  }
  if (atlasEvent.IgnoreObservationPeriod !== undefined) {
    event.ignoreObservationPeriod = atlasEvent.IgnoreObservationPeriod
  }

  // US4: Extract DateAdjustment
  if (atlasEvent.DateAdjustment) {
    event.dateAdjustment = {
      startWith: atlasEvent.DateAdjustment.StartWith,
      startOffset: atlasEvent.DateAdjustment.StartOffset,
      endWith: atlasEvent.DateAdjustment.EndWith,
      endOffset: atlasEvent.DateAdjustment.EndOffset,
    }
  }

  // Convert Atlas CorrelatedCriteria to nested criteria
  if (atlasEvent.CorrelatedCriteria) {
    event.nestedCriteria = {
      id: generateId(),
      logicType: atlasEvent.CorrelatedCriteria.Type || 'ALL',
      count: atlasEvent.CorrelatedCriteria.Count,
      events: atlasEvent.CorrelatedCriteria.CriteriaList?.map((e: any) => convertAtlasToEvent(e, conceptSets)) || []
    }
  }

  return event
}

/**
 * Convert DemographicCriteria to a pseudo-event for rendering
 * DemographicCriteria doesn't have a CodesetId, so we create a special event type
 */
function convertDemographicCriteriaToEvent(demographicCriteria: any): CohortEvent {
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
function extractAttributesFromCriteria(criteriaObj: any): any[] {
  const attributes: any[] = []

  // Age - NumericRange
  if (criteriaObj.Age) {
    attributes.push({
      type: 'numericRange',
      attributeKey: 'age',
      operator: convertAtlasToOperator(criteriaObj.Age.Op),
      value: criteriaObj.Age.Value,
      extent: criteriaObj.Age.Extent,
    })
  }

  // AgeAtStart - NumericRange (for Eras)
  if (criteriaObj.AgeAtStart) {
    attributes.push({
      type: 'numericRange',
      attributeKey: 'age',
      operator: convertAtlasToOperator(criteriaObj.AgeAtStart.Op),
      value: criteriaObj.AgeAtStart.Value,
      extent: criteriaObj.AgeAtStart.Extent,
    })
  }

  // Gender - ConceptSet
  if (criteriaObj.Gender && Array.isArray(criteriaObj.Gender) && criteriaObj.Gender.length > 0) {
    attributes.push({
      type: 'conceptSet',
      attributeKey: 'gender',
      conceptSet: {
        id: 'gender-concepts',
        name: criteriaObj.Gender.map((c: any) => c.CONCEPT_NAME || 'Unknown').join(', '),
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
        name: criteriaObj.Race.map((c: any) => c.CONCEPT_NAME || 'Unknown').join(', '),
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
        name: criteriaObj.Ethnicity.map((c: any) => c.CONCEPT_NAME || 'Unknown').join(', '),
      },
    })
  }

  // ValueAsNumber - NumericRange
  if (criteriaObj.ValueAsNumber) {
    attributes.push({
      type: 'numericRange',
      attributeKey: 'valueAsNumber',
      operator: convertAtlasToOperator(criteriaObj.ValueAsNumber.Op),
      value: criteriaObj.ValueAsNumber.Value,
      extent: criteriaObj.ValueAsNumber.Extent,
    })
  }

  // ValueAsString - Text
  if (criteriaObj.ValueAsString) {
    attributes.push({
      type: 'text',
      attributeKey: 'valueAsString',
      operator: 'CONTAINS',
      value: criteriaObj.ValueAsString,
    })
  }

  // OccurrenceStartDate - DateRange
  if (criteriaObj.OccurrenceStartDate) {
    attributes.push({
      type: 'dateRange',
      attributeKey: 'occurrenceStartDate',
      operator: convertAtlasToOperator(criteriaObj.OccurrenceStartDate.Op),
      value: criteriaObj.OccurrenceStartDate.Value,
      extent: criteriaObj.OccurrenceStartDate.Extent,
    })
  }

  // OccurrenceEndDate - DateRange
  if (criteriaObj.OccurrenceEndDate) {
    attributes.push({
      type: 'dateRange',
      attributeKey: 'occurrenceEndDate',
      operator: convertAtlasToOperator(criteriaObj.OccurrenceEndDate.Op),
      value: criteriaObj.OccurrenceEndDate.Value,
      extent: criteriaObj.OccurrenceEndDate.Extent,
    })
  }

  // EraStartDate - DateRange
  if (criteriaObj.EraStartDate) {
    attributes.push({
      type: 'dateRange',
      attributeKey: 'eraStartDate',
      operator: convertAtlasToOperator(criteriaObj.EraStartDate.Op),
      value: criteriaObj.EraStartDate.Value,
      extent: criteriaObj.EraStartDate.Extent,
    })
  }

  // EraEndDate - DateRange
  if (criteriaObj.EraEndDate) {
    attributes.push({
      type: 'dateRange',
      attributeKey: 'eraEndDate',
      operator: convertAtlasToOperator(criteriaObj.EraEndDate.Op),
      value: criteriaObj.EraEndDate.Value,
      extent: criteriaObj.EraEndDate.Extent,
    })
  }

  // VisitLength - NumericRange
  if (criteriaObj.VisitLength) {
    attributes.push({
      type: 'numericRange',
      attributeKey: 'visitLength',
      operator: convertAtlasToOperator(criteriaObj.VisitLength.Op),
      value: criteriaObj.VisitLength.Value,
      extent: criteriaObj.VisitLength.Extent,
    })
  }

  // EraLength - NumericRange
  if (criteriaObj.EraLength) {
    attributes.push({
      type: 'numericRange',
      attributeKey: 'eraLength',
      operator: convertAtlasToOperator(criteriaObj.EraLength.Op),
      value: criteriaObj.EraLength.Value,
      extent: criteriaObj.EraLength.Extent,
    })
  }

  // Quantity - NumericRange
  if (criteriaObj.Quantity) {
    attributes.push({
      type: 'numericRange',
      attributeKey: 'quantity',
      operator: convertAtlasToOperator(criteriaObj.Quantity.Op),
      value: criteriaObj.Quantity.Value,
      extent: criteriaObj.Quantity.Extent,
    })
  }

  // VisitType - ConceptSet
  if (criteriaObj.VisitType && Array.isArray(criteriaObj.VisitType) && criteriaObj.VisitType.length > 0) {
    attributes.push({
      type: 'conceptSet',
      attributeKey: 'visitType',
      conceptSet: {
        id: 'visit-type-concepts',
        name: criteriaObj.VisitType.map((c: any) => c.CONCEPT_NAME || 'Unknown').join(', '),
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
        name: criteriaObj.ProviderSpecialty.map((c: any) => c.CONCEPT_NAME || 'Unknown').join(', '),
      },
    })
  }

  // First - Boolean
  if (criteriaObj.First !== undefined) {
    attributes.push({
      type: 'boolean',
      attributeKey: 'first',
      value: criteriaObj.First,
    })
  }

  // TemporalRelationship - TemporalWindow attribute
  if (criteriaObj.TemporalRelationship && criteriaObj.TemporalRelationship.StartWindow) {
    attributes.push(parseTemporalRelationshipAttribute('temporalRelationship', criteriaObj.TemporalRelationship))
  }

  // DateAdjustment - Date adjustment attribute
  if (criteriaObj.DateAdjustment && criteriaObj.DateAdjustment.StartWith) {
    attributes.push(parseDateAdjustmentAttribute('dateAdjustment', criteriaObj.DateAdjustment))
  }

  // UserDefinedPeriod - Custom period with start and end dates
  if (criteriaObj.PeriodStartDate && criteriaObj.PeriodEndDate) {
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
function convertPeriodToAtlas(period: Period): any {
  const result: any = {}

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
function convertDateFieldToAtlas(dateField: DateField): any {
  return {
    DateField: dateField.dateField,
    Offset: dateField.offset ?? 0,
  }
}

/**
 * Convert Atlas Period to internal format
 */
function convertPeriodFromAtlas(atlasPeriod: any): Period {
  const period: Period = {}

  if (atlasPeriod.StartDate) {
    period.startDate = convertDateFieldFromAtlas(atlasPeriod.StartDate)
  }

  if (atlasPeriod.EndDate) {
    period.endDate = convertDateFieldFromAtlas(atlasPeriod.EndDate)
  }

  return period
}

/**
 * Convert Atlas DateField to internal format
 */
function convertDateFieldFromAtlas(atlasDateField: any): DateField {
  return {
    dateField: atlasDateField.DateField,
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
