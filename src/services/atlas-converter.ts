// CRITICAL: Uses ?? operator for zero-count preservation (not ||)

import type {
  CohortDefinition,
  CohortEvent,
  CensorWindow,
  CriteriaType,
  QualifyingLimit,
  LogicType,
} from '@/models/cohort.types'
import type { EventAttribute } from '@/models/event.types'
import type {
  AtlasConceptSet,
  AtlasCriteria,
  AtlasInclusionRule,
  AtlasConcept,
  ConceptSetItem,
  AtlasCriteriaTypeObject,
  AtlasConceptSetItem,
} from '@/models/atlas.types'

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

const SOURCE_CONCEPT_KEYS: Partial<Record<CriteriaType, string>> = {
  ConditionOccurrence: 'ConditionSourceConcept',
  ProcedureOccurrence: 'ProcedureSourceConcept',
  DrugExposure: 'DrugSourceConcept',
  Measurement: 'MeasurementSourceConcept',
  Observation: 'ObservationSourceConcept',
  DeviceExposure: 'DeviceSourceConcept',
  Death: 'DeathSourceConcept',
  Specimen: 'SpecimenSourceConcept',
  VisitOccurrence: 'VisitSourceConcept',
  VisitDetail: 'VisitDetailSourceConcept',
}

// CRITICAL: Preserves zero-count cardinality using ?? operator
export function convertInternalToAtlas(cohort: CohortDefinition): AtlasJSON {
  return {
    expressionType: cohort.expressionType ?? 'SIMPLE_EXPRESSION',
    cdmVersionRange: cohort.cdmVersionRange ?? '>=5.0.0',

    ConceptSets: cohort.conceptSets.map((cs, index) => ({
      id: typeof cs.id === 'number' ? cs.id : index,
      name: cs.name,
      expression: {
        items:
          (cs.items as ConceptSetItem[] | undefined)?.map(item => {
            const concept: AtlasConcept = {
              CONCEPT_ID: item.conceptId,
              CONCEPT_NAME: item.conceptName,
              DOMAIN_ID: item.domainId,
              VOCABULARY_ID: item.vocabularyId,
              CONCEPT_CLASS_ID: item.conceptClassId,
            }

            if (item.standardConcept !== undefined && item.standardConcept !== null) {
              concept.STANDARD_CONCEPT = item.standardConcept
              concept.STANDARD_CONCEPT_CAPTION =
                item.standardConcept === 'S'
                  ? 'Standard'
                  : item.standardConcept === 'C'
                    ? 'Classification'
                    : 'Non-Standard'
            }

            if (item.conceptCode !== undefined && item.conceptCode !== null) {
              concept.CONCEPT_CODE = item.conceptCode
            }

            concept.INVALID_REASON = item.invalidReason || 'V'
            concept.INVALID_REASON_CAPTION =
              item.invalidReason === 'V' || !item.invalidReason ? 'Valid' : 'Invalid'

            return {
              concept,
              isExcluded: item.isExcluded ?? false,
              includeDescendants: item.includeDescendants ?? false,
              includeMapped: item.includeMapped ?? false,
            }
          }) || [],
      },
    })),

    PrimaryCriteria: {
      CriteriaList: cohort.entryEvents.map(event => convertEventToAtlas(event, false)),
      ObservationWindow: cohort.observationPeriod
        ? {
            PriorDays: cohort.observationPeriod.priorDays,
            PostDays: cohort.observationPeriod.postDays,
          }
        : undefined,
      PrimaryCriteriaLimit: {
        Type: capitalizeFirst(
          cohort.primaryCriteriaLimit ||
            cohort.additionalCriteria?.qualifyingLimit ||
            'All',
        ),
      },
    },

    AdditionalCriteria: cohort.additionalCriteria
      ? {
          Type: cohort.additionalCriteria.logicType || 'ALL',
          CriteriaList: cohort.additionalCriteria.events
            .filter(e => e.criteriaType !== 'Demographic')
            .map(e => convertEventToAtlas(e, true)),
          DemographicCriteriaList: cohort.additionalCriteria.events
            .filter(e => e.criteriaType === 'Demographic')
            .map(convertDemographicEventToAtlas),
          Groups: [],
        }
      : {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },

    InclusionRules: cohort.inclusionRules.map(rule => ({
      name: rule.name,
      ...(rule.description ? { description: rule.description } : {}),
      expression: {
        Type: 'ALL',
        CriteriaList: rule.criteriaGroups.flatMap(g =>
          g.events
            .filter(e => e.criteriaType !== 'Demographic')
            .map(e => convertEventToAtlas(e, true)),
        ),
        DemographicCriteriaList: rule.criteriaGroups.flatMap(g =>
          g.events
            .filter(e => e.criteriaType === 'Demographic')
            .map(convertDemographicEventToAtlas),
        ),
        Groups: [],
      },
    })),

    CensoringCriteria: cohort.censoringCriteria?.map(e => convertEventToAtlas(e, false)) || [],

    QualifiedLimit: { Type: capitalizeFirst(cohort.qualifyingLimit || 'All') },

    ExpressionLimit: cohort.inclusionQualifyingLimit
      ? { Type: capitalizeFirst(cohort.inclusionQualifyingLimit) }
      : { Type: 'All' },

    CollapseSettings: cohort.collapseSettings
      ? {
          CollapseType: cohort.collapseSettings.collapseType,
          EraPad: cohort.collapseSettings.eraPad,
        }
      : {
          CollapseType: 'ERA',
          EraPad: 0,
        },

    CensorWindow: cohort.censorWindow ? convertCensorWindowToAtlas(cohort.censorWindow) : {},
  }
}

function convertDemographicEventToAtlas(event: CohortEvent): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const attr of event.attributes ?? []) {
    Object.assign(out, convertAttributeToAtlas(attr))
  }
  return out
}

// CRITICAL: Uses ?? for zero-count preservation
function convertEventToAtlas(event: CohortEvent, wrapInCriteria: boolean = false): AtlasCriteria {
  if (event.criteriaType === 'Demographic') {
    throw new Error(
      'convertEventToAtlas was called with a Demographic event; route via convertDemographicEventToAtlas instead',
    )
  }

  const criteriaTypeObj: AtlasCriteriaTypeObject = {}
  if (event.conceptSet && typeof event.conceptSet.id === 'number') {
    criteriaTypeObj.CodesetId = event.conceptSet.id
  } else if (typeof event.sourceConceptId === 'number') {
    const sourceKey = SOURCE_CONCEPT_KEYS[event.criteriaType]
    if (sourceKey) (criteriaTypeObj as Record<string, unknown>)[sourceKey] = event.sourceConceptId
  } else {
    criteriaTypeObj.CodesetId = null
  }

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
      break
  }

  if (event.attributes && event.attributes.length > 0) {
    event.attributes.forEach(attr => {
      const atlasAttr = convertAttributeToAtlas(attr)
      Object.assign(criteriaTypeObj, atlasAttr)
    })
  }

  const criteriaObject: Record<string, AtlasCriteriaTypeObject> = {
    [event.criteriaType]: criteriaTypeObj,
  }

  const atlasEvent: AtlasCriteria = wrapInCriteria ? { Criteria: criteriaObject } : criteriaObject

  // CRITICAL: use ?? not ||
  if (event.cardinality) {
    atlasEvent.Occurrence = {
      Type:
        event.cardinality.type === 'EXACTLY'
          ? 0
          : event.cardinality.type === 'AT_MOST'
            ? 1
            : event.cardinality.type === 'AT_LEAST'
              ? 2
              : 0,
      Count: event.cardinality.count ?? 1,
      CountMethod: event.cardinality.countingMethod || 'ALL',
      IsDistinct: event.cardinality.isDistinct ?? false,
    }
    if (event.cardinality.countColumn) {
      atlasEvent.Occurrence.CountColumn = event.cardinality.countColumn
    }
  }

  if (event.temporalWindow) {
    if (event.temporalWindow.startWindow) {
      const startDays = event.temporalWindow.startWindow.days
      const endDays = event.temporalWindow.endWindow?.days

      atlasEvent.StartWindow = {
        Start: {
          ...(startDays !== null ? { Days: startDays } : {}),
          Coeff: event.temporalWindow.startWindow.beforeAfter === 'AFTER' ? 1 : -1,
        },
        End: event.temporalWindow.endWindow
          ? {
              ...(endDays !== null ? { Days: endDays } : {}),
              Coeff: event.temporalWindow.endWindow.beforeAfter === 'AFTER' ? 1 : -1,
            }
          : undefined,
        UseIndexEnd: event.temporalWindow.startWindow.referencePoint === 'INDEX_END',
        UseEventEnd: event.temporalWindow.startWindow.referencePoint === 'EVENT_END',
      }
    }
  }

  if (event.dateAdjustment) {
    atlasEvent.DateAdjustment = {
      StartWith: event.dateAdjustment.startWith,
      StartOffset: event.dateAdjustment.startOffset,
      EndWith: event.dateAdjustment.endWith,
      EndOffset: event.dateAdjustment.endOffset,
    }
  }

  if (wrapInCriteria) {
    atlasEvent.RestrictVisit = event.restrictVisit ?? false
    atlasEvent.IgnoreObservationPeriod = event.ignoreObservationPeriod ?? false
  }

  if (event.nestedCriteria) {
    atlasEvent.CorrelatedCriteria = {
      Type: event.nestedCriteria.logicType,
      Count: event.nestedCriteria.count,
      CriteriaList: event.nestedCriteria.events.map(e => convertEventToAtlas(e, true)),
      DemographicCriteriaList: [],
      Groups: [],
    }
  }

  return atlasEvent
}

function convertTextAttribute(attributeKey: string, value: string): Record<string, string> {
  const attributeName = convertToPascalCase(attributeKey)
  return { [attributeName]: value }
}

export function parseTextAttribute(attributeKey: string, value: string): EventAttribute {
  return {
    type: 'text',
    attributeKey: attributeKey as 'valueAsString',
    operator: 'CONTAINS',
    value,
  }
}

function convertBooleanAttribute(attributeKey: string, value: boolean): Record<string, boolean> {
  const attributeName = convertToPascalCase(attributeKey)
  return { [attributeName]: value }
}

export function parseBooleanAttribute(attributeKey: string, value: boolean): EventAttribute {
  return {
    type: 'boolean',
    attributeKey: attributeKey as 'first',
    value,
  }
}

function convertConceptAttribute(
  attributeKey: string,
  concepts: unknown[]
): Record<string, unknown> {
  const attributeName = convertToPascalCase(attributeKey)
  return { [attributeName]: concepts }
}

export function parseConceptAttribute(
  attributeKey: string,
  concepts: unknown[],
  isExclusion?: boolean
): EventAttribute {
  return {
    type: 'concept',
    attributeKey: attributeKey as import('@/models/event.types').ConceptAttributeKey,
    concepts: (concepts as import('@/models/event.types').Concept[]) || [],
    ...(isExclusion ? { isExclusion: true } : {}),
  }
}

/**
 * Parse an Atlas 2.x `*CS` concept-set attribute (e.g. `VisitTypeCS: { CodesetId, IsExclusion }`)
 * into a Atlas3 ConceptSetAttribute. Returns undefined if the field is missing or empty.
 */
export function parseConceptSetAttribute(
  attributeKey: string,
  raw: unknown
): EventAttribute | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const obj = raw as { CodesetId?: number | string | null; IsExclusion?: boolean }
  if (obj.CodesetId === undefined || obj.CodesetId === null) return undefined
  return {
    type: 'conceptSet',
    attributeKey: attributeKey as import('@/models/event.types').ConceptAttributeKey,
    conceptSet: { id: obj.CodesetId, name: '' },
    ...(obj.IsExclusion ? { isExclusion: true } : {}),
  }
}

function convertTemporalRelationshipAttribute(
  attributeKey: string,
  temporalWindow: {
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
  }
): Record<string, unknown> {
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
      End: temporalWindow.endWindow
        ? {
            ...(endDays !== null ? { Days: endDays } : {}),
            Coeff: temporalWindow.endWindow.beforeAfter === 'AFTER' ? 1 : -1,
          }
        : undefined,
      UseIndexEnd: temporalWindow.startWindow.referencePoint === 'INDEX_END',
      UseEventEnd: temporalWindow.startWindow.referencePoint === 'EVENT_END',
    }
  }

  return { [attributeName]: atlasWindow }
}

export function parseTemporalRelationshipAttribute(
  attributeKey: string,
  temporalWindowData: {
    StartWindow?: {
      Start?: { Days?: number; Coeff?: number }
      End?: { Days?: number; Coeff?: number }
      UseIndexEnd?: boolean
      UseEventEnd?: boolean
    }
  }
): EventAttribute {
  return {
    type: 'temporalRelationship',
    attributeKey: attributeKey as 'temporalRelationship',
    temporalWindow: {
      startWindow: temporalWindowData.StartWindow?.Start
        ? {
            days:
              temporalWindowData.StartWindow.Start.Days !== undefined
                ? temporalWindowData.StartWindow.Start.Days
                : null,
            beforeAfter: (temporalWindowData.StartWindow.Start.Coeff ?? 1) < 0 ? 'BEFORE' : 'AFTER',
            referencePoint: temporalWindowData.StartWindow.UseIndexEnd
              ? 'INDEX_END'
              : temporalWindowData.StartWindow.UseEventEnd
                ? 'EVENT_END'
                : 'INDEX_START',
          }
        : undefined,
      endWindow: temporalWindowData.StartWindow?.End
        ? {
            days:
              temporalWindowData.StartWindow.End.Days !== undefined
                ? temporalWindowData.StartWindow.End.Days
                : null,
            beforeAfter: (temporalWindowData.StartWindow.End.Coeff ?? 1) < 0 ? 'BEFORE' : 'AFTER',
            referencePoint: temporalWindowData.StartWindow.UseIndexEnd
              ? 'INDEX_END'
              : temporalWindowData.StartWindow.UseEventEnd
                ? 'EVENT_END'
                : 'INDEX_START',
          }
        : undefined,
    },
  }
}

function convertDateAdjustmentAttribute(
  attributeKey: string,
  dateAdjustment: {
    startWith: string
    startOffset: number
    endWith: string
    endOffset: number
  }
): Record<string, unknown> {
  const attributeName = convertToPascalCase(attributeKey)
  return {
    [attributeName]: {
      StartWith: dateAdjustment.startWith,
      StartOffset: dateAdjustment.startOffset,
      EndWith: dateAdjustment.endWith,
      EndOffset: dateAdjustment.endOffset,
    },
  }
}

export function parseDateAdjustmentAttribute(
  attributeKey: string,
  dateAdjustmentData: {
    StartWith?: string
    StartOffset?: number
    EndWith?: string
    EndOffset?: number
  }
): EventAttribute {
  return {
    type: 'dateAdjustment',
    attributeKey: attributeKey as 'dateAdjustment',
    dateAdjustment: {
      startWith: (dateAdjustmentData.StartWith as 'START_DATE' | 'END_DATE') || 'START_DATE',
      startOffset: dateAdjustmentData.StartOffset || 0,
      endWith: (dateAdjustmentData.EndWith as 'START_DATE' | 'END_DATE') || 'END_DATE',
      endOffset: dateAdjustmentData.EndOffset || 0,
    },
  }
}

function convertUserDefinedPeriodAttribute(
  _attributeKey: string,
  period: {
    startDate: string
    endDate: string
  }
): Record<string, string> {
  return {
    PeriodStartDate: period.startDate,
    PeriodEndDate: period.endDate,
  }
}

export function parseUserDefinedPeriodAttribute(
  attributeKey: string,
  startDate: string,
  endDate: string
): EventAttribute {
  return {
    type: 'userDefinedPeriod',
    attributeKey: attributeKey as 'userDefinedPeriod',
    period: {
      startDate,
      endDate,
    },
  }
}

function convertAttributeToAtlas(attr: EventAttribute): Record<string, unknown> {
  if (!attr || typeof attr !== 'object' || !attr.type) {
    return {}
  }

  if (attr.type === 'numericRange' || attr.type === 'dateRange') {
    const attributeName = convertToPascalCase(attr.attributeKey)
    const result: Record<string, { Op: string; Value: unknown; Extent?: unknown }> = {
      [attributeName]: {
        Op: convertOperatorToAtlas(attr.operator),
        Value: attr.value,
      },
    }
    if (attr.extent !== undefined) {
      const attrValue = result[attributeName]
      if (attrValue && typeof attrValue === 'object') {
        attrValue.Extent = attr.extent
      }
    }
    return result
  } else if (attr.type === 'conceptSet') {
    const attributeName = attributeKeyToAtlasField(attr.attributeKey)
    const id = attr.conceptSet?.id
    return {
      [attributeName]: {
        CodesetId: typeof id === 'number' ? id : null,
        IsExclusion: attr.isExclusion ?? false,
      },
    }
  } else if (attr.type === 'concept') {
    const out = convertConceptAttribute(attr.attributeKey, attr.concepts)
    if (attr.isExclusion) {
      out[convertToPascalCase(attr.attributeKey) + 'Exclude'] = true
    }
    return out
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

export function convertAtlasToInternal(atlas: AtlasJSON): Partial<CohortDefinition> {
  return {
    expressionType: atlas.expressionType,
    cdmVersionRange: atlas.cdmVersionRange,
    collapseSettings: atlas.CollapseSettings
      ? {
          collapseType: atlas.CollapseSettings.CollapseType as 'ERA',
          eraPad: atlas.CollapseSettings.EraPad,
        }
      : undefined,
    censorWindow:
      atlas.CensorWindow && Object.keys(atlas.CensorWindow).length > 0
        ? convertCensorWindowFromAtlas(atlas.CensorWindow)
        : undefined,
    censoringCriteria:
      atlas.CensoringCriteria && atlas.CensoringCriteria.length > 0
        ? atlas.CensoringCriteria.map(e => convertAtlasToEvent(e, atlas.ConceptSets))
        : undefined,

    entryEvents:
      atlas.PrimaryCriteria?.CriteriaList?.map(e => convertAtlasToEvent(e, atlas.ConceptSets)) ||
      [],
    observationPeriod: atlas.PrimaryCriteria?.ObservationWindow
      ? {
          priorDays: atlas.PrimaryCriteria.ObservationWindow.PriorDays,
          postDays: atlas.PrimaryCriteria.ObservationWindow.PostDays,
        }
      : undefined,
    qualifyingLimit: (atlas.QualifiedLimit?.Type?.toUpperCase() || 'ALL') as QualifyingLimit,
    primaryCriteriaLimit: (atlas.PrimaryCriteria?.PrimaryCriteriaLimit?.Type?.toUpperCase() ||
      'ALL') as QualifyingLimit,
    inclusionQualifyingLimit: atlas.ExpressionLimit?.Type
      ? (atlas.ExpressionLimit.Type.toUpperCase() as QualifyingLimit)
      : undefined,
    // Parse AdditionalCriteria
    additionalCriteria:
      atlas.AdditionalCriteria?.CriteriaList && atlas.AdditionalCriteria.CriteriaList.length > 0
        ? {
            id: generateId(),
            logicType: (atlas.AdditionalCriteria.Type || 'ALL') as LogicType,
            qualifyingLimit: (atlas.PrimaryCriteria?.PrimaryCriteriaLimit?.Type?.toUpperCase() ||
              'ALL') as QualifyingLimit,
            events: atlas.AdditionalCriteria.CriteriaList.map((e: AtlasCriteria) =>
              convertAtlasToEvent(e, atlas.ConceptSets)
            ),
          }
        : undefined,
    inclusionRules:
      atlas.InclusionRules?.map((rule: AtlasInclusionRule) => {
        const criteriaGroups: import('@/models/cohort.types').CriteriaGroup[] = []

        if (rule.expression?.CriteriaList && rule.expression.CriteriaList.length > 0) {
          criteriaGroups.push({
            id: generateId(),
            logicType: (rule.expression.Type || 'ALL') as LogicType,
            events: rule.expression.CriteriaList.map((e: AtlasCriteria) =>
              convertAtlasToEvent(e, atlas.ConceptSets)
            ),
          })
        }

        if (
          rule.expression?.DemographicCriteriaList &&
          rule.expression.DemographicCriteriaList.length > 0
        ) {
          const demographicEvents = (
            rule.expression.DemographicCriteriaList as Array<Record<string, unknown>>
          ).map(dc => convertDemographicCriteriaToEvent(dc))

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

        if (rule.expression?.Groups && rule.expression.Groups.length > 0) {
          criteriaGroups.push(
            ...rule.expression.Groups.map((group: import('@/models/atlas.types').AtlasGroup) => ({
              id: generateId(),
              logicType: (group.Type || 'ALL') as LogicType,
              events:
                group.CriteriaList?.map((e: AtlasCriteria) =>
                  convertAtlasToEvent(e, atlas.ConceptSets)
                ) || [],
            }))
          )
        }

        return {
          id: generateId(),
          name: rule.name || 'Unnamed Rule',
          description: rule.description || '',
          criteriaGroups,
        }
      }) || [],
    conceptSets:
      atlas.ConceptSets?.map(cs => ({
        id: cs.id,
        name: cs.name,
        items:
          cs.expression?.items?.map((item: AtlasConceptSetItem) => ({
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

function convertAtlasToEvent(
  atlasEvent: AtlasCriteria,
  conceptSets?: AtlasConceptSet[]
): CohortEvent {
  let criteriaType: string
  let criteriaObj: Record<string, unknown>

  if (atlasEvent.Criteria) {
    criteriaType = Object.keys(atlasEvent.Criteria)[0] || 'ConditionOccurrence'
    criteriaObj =
      (atlasEvent.Criteria as Record<string, Record<string, unknown>>)[criteriaType] || {}
  } else {
    const possibleTypes = [
      'ConditionOccurrence',
      'ConditionEra',
      'DrugExposure',
      'DrugEra',
      'ProcedureOccurrence',
      'Observation',
      'VisitOccurrence',
      'VisitDetail',
      'Measurement',
      'DeviceExposure',
      'Specimen',
      'Death',
      'ObservationPeriod',
      'PayerPlanPeriod',
      'LocationRegion',
    ]
    criteriaType =
      possibleTypes.find(t => (atlasEvent as Record<string, unknown>)[t]) || 'ConditionOccurrence'
    criteriaObj =
      ((atlasEvent as Record<string, unknown>)[criteriaType] as Record<string, unknown>) || {}
  }

  const codesetId = criteriaObj.CodesetId as number | null | undefined
  const conceptSet =
    typeof codesetId === 'number' && conceptSets
      ? conceptSets.find(cs => cs.id === codesetId)
      : undefined

  const event: CohortEvent = {
    id: generateId(),
    criteriaType: criteriaType as CriteriaType,
    conceptSet: conceptSet
      ? {
          id: conceptSet.id,
          name: conceptSet.name,
          items:
            conceptSet.expression?.items?.map(
              (item: {
                concept: AtlasConcept
                includeDescendants?: boolean
                isExcluded?: boolean
                includeMapped?: boolean
              }) => ({
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
              })
            ) || [],
        }
      : undefined,
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
        type:
          occurrence.Type === 0
            ? 'EXACTLY'
            : occurrence.Type === 1
              ? 'AT_MOST'
              : occurrence.Type === 2
                ? 'AT_LEAST'
                : 'EXACTLY',
        count: occurrence.Count ?? 1,
        countingMethod:
          (occurrence.CountMethod as import('@/models/event.types').CountingMethod) || 'ALL',
        isDistinct: occurrence.IsDistinct,
        countColumn: occurrence.CountColumn,
      }
    })(),
    attributes: [],
  }

  event.attributes = extractAttributesFromCriteria(criteriaObj)

  const sourceKey = SOURCE_CONCEPT_KEYS[event.criteriaType]
  if (sourceKey && typeof criteriaObj[sourceKey] === 'number') {
    event.sourceConceptId = criteriaObj[sourceKey] as number
  }

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
      startWindow: startWindow.Start
        ? {
            days: startWindow.Start.Days !== undefined ? startWindow.Start.Days : null,
            beforeAfter: (startWindow.Start.Coeff ?? 1) < 0 ? 'BEFORE' : 'AFTER',
            referencePoint: startWindow.UseIndexEnd
              ? 'INDEX_END'
              : startWindow.UseEventEnd
                ? 'EVENT_END'
                : 'INDEX_START',
          }
        : undefined,
      endWindow: startWindow.End
        ? {
            days: startWindow.End.Days !== undefined ? startWindow.End.Days : null,
            beforeAfter: (startWindow.End.Coeff ?? 1) < 0 ? 'BEFORE' : 'AFTER',
            referencePoint: startWindow.UseIndexEnd
              ? 'INDEX_END'
              : startWindow.UseEventEnd
                ? 'EVENT_END'
                : 'INDEX_START',
          }
        : undefined,
    }
  }

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
      events:
        correlatedCriteria.CriteriaList?.map((e: AtlasCriteria) =>
          convertAtlasToEvent(e, conceptSets)
        ) || [],
    }
  }

  return event
}

function convertDemographicCriteriaToEvent(
  demographicCriteria: Record<string, unknown>
): CohortEvent {
  return {
    id: generateId(),
    criteriaType: 'Demographic',
    attributes: extractAttributesFromCriteria(demographicCriteria),
  }
}

function extractAttributesFromCriteria(criteriaObj: Record<string, unknown>): EventAttribute[] {
  const attributes: EventAttribute[] = []

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

  if (
    criteriaObj.AgeAtStart &&
    typeof criteriaObj.AgeAtStart === 'object' &&
    criteriaObj.AgeAtStart !== null
  ) {
    const ageAtStart = criteriaObj.AgeAtStart as { Op: string; Value: number; Extent?: number }
    attributes.push({
      type: 'numericRange',
      attributeKey: 'age',
      operator: convertAtlasToOperator(
        ageAtStart.Op
      ) as import('@/models/event.types').NumericOperator,
      value: ageAtStart.Value,
      extent: ageAtStart.Extent,
    })
  }

  // Gender - Concept array
  if (criteriaObj.Gender && Array.isArray(criteriaObj.Gender) && criteriaObj.Gender.length > 0) {
    attributes.push(
      parseConceptAttribute(
        'gender',
        criteriaObj.Gender,
        criteriaObj.GenderExclude as boolean | undefined
      )
    )
  }
  {
    const cs = parseConceptSetAttribute('genderCs', criteriaObj.GenderCS)
    if (cs) attributes.push(cs)
  }

  // Race - Concept array
  if (criteriaObj.Race && Array.isArray(criteriaObj.Race) && criteriaObj.Race.length > 0) {
    attributes.push(
      parseConceptAttribute(
        'race',
        criteriaObj.Race,
        criteriaObj.RaceExclude as boolean | undefined
      )
    )
  }
  {
    const cs = parseConceptSetAttribute('raceCs', criteriaObj.RaceCS)
    if (cs) attributes.push(cs)
  }

  // Ethnicity - Concept array
  if (
    criteriaObj.Ethnicity &&
    Array.isArray(criteriaObj.Ethnicity) &&
    criteriaObj.Ethnicity.length > 0
  ) {
    attributes.push(
      parseConceptAttribute(
        'ethnicity',
        criteriaObj.Ethnicity,
        criteriaObj.EthnicityExclude as boolean | undefined
      )
    )
  }
  {
    const cs = parseConceptSetAttribute('ethnicityCs', criteriaObj.EthnicityCS)
    if (cs) attributes.push(cs)
  }

  // ConditionType - Concept array with optional Exclude flag
  if (
    criteriaObj.ConditionType &&
    Array.isArray(criteriaObj.ConditionType) &&
    criteriaObj.ConditionType.length > 0
  ) {
    attributes.push(
      parseConceptAttribute(
        'conditionType',
        criteriaObj.ConditionType,
        criteriaObj.ConditionTypeExclude as boolean | undefined
      )
    )
  }
  {
    const cs = parseConceptSetAttribute('conditionTypeCs', criteriaObj.ConditionTypeCS)
    if (cs) attributes.push(cs)
  }

  // ConditionStatus - Concept array with optional CS variant
  if (
    criteriaObj.ConditionStatus &&
    Array.isArray(criteriaObj.ConditionStatus) &&
    criteriaObj.ConditionStatus.length > 0
  ) {
    attributes.push(
      parseConceptAttribute(
        'conditionStatus',
        criteriaObj.ConditionStatus,
        criteriaObj.ConditionStatusExclude as boolean | undefined
      )
    )
  }
  {
    const cs = parseConceptSetAttribute('conditionStatusCs', criteriaObj.ConditionStatusCS)
    if (cs) attributes.push(cs)
  }

  // ValueAsNumber - NumericRange
  if (
    criteriaObj.ValueAsNumber &&
    typeof criteriaObj.ValueAsNumber === 'object' &&
    criteriaObj.ValueAsNumber !== null
  ) {
    const valueAsNumber = criteriaObj.ValueAsNumber as {
      Op: string
      Value: number
      Extent?: number
    }
    attributes.push({
      type: 'numericRange',
      attributeKey: 'valueAsNumber',
      operator: convertAtlasToOperator(
        valueAsNumber.Op
      ) as import('@/models/event.types').NumericOperator,
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
  if (
    criteriaObj.OccurrenceStartDate &&
    typeof criteriaObj.OccurrenceStartDate === 'object' &&
    criteriaObj.OccurrenceStartDate !== null
  ) {
    const occurrenceStartDate = criteriaObj.OccurrenceStartDate as {
      Op: string
      Value: string
      Extent?: string
    }
    attributes.push({
      type: 'dateRange',
      attributeKey: 'occurrenceStartDate',
      operator: convertAtlasToOperator(
        occurrenceStartDate.Op
      ) as import('@/models/event.types').DateOperator,
      value: occurrenceStartDate.Value,
      extent: occurrenceStartDate.Extent,
    })
  }

  // OccurrenceEndDate - DateRange
  if (
    criteriaObj.OccurrenceEndDate &&
    typeof criteriaObj.OccurrenceEndDate === 'object' &&
    criteriaObj.OccurrenceEndDate !== null
  ) {
    const occurrenceEndDate = criteriaObj.OccurrenceEndDate as {
      Op: string
      Value: string
      Extent?: string
    }
    attributes.push({
      type: 'dateRange',
      attributeKey: 'occurrenceEndDate',
      operator: convertAtlasToOperator(
        occurrenceEndDate.Op
      ) as import('@/models/event.types').DateOperator,
      value: occurrenceEndDate.Value,
      extent: occurrenceEndDate.Extent,
    })
  }

  // EraStartDate - DateRange
  if (
    criteriaObj.EraStartDate &&
    typeof criteriaObj.EraStartDate === 'object' &&
    criteriaObj.EraStartDate !== null
  ) {
    const eraStartDate = criteriaObj.EraStartDate as { Op: string; Value: string; Extent?: string }
    attributes.push({
      type: 'dateRange',
      attributeKey: 'eraStartDate',
      operator: convertAtlasToOperator(
        eraStartDate.Op
      ) as import('@/models/event.types').DateOperator,
      value: eraStartDate.Value,
      extent: eraStartDate.Extent,
    })
  }

  // EraEndDate - DateRange
  if (
    criteriaObj.EraEndDate &&
    typeof criteriaObj.EraEndDate === 'object' &&
    criteriaObj.EraEndDate !== null
  ) {
    const eraEndDate = criteriaObj.EraEndDate as { Op: string; Value: string; Extent?: string }
    attributes.push({
      type: 'dateRange',
      attributeKey: 'eraEndDate',
      operator: convertAtlasToOperator(
        eraEndDate.Op
      ) as import('@/models/event.types').DateOperator,
      value: eraEndDate.Value,
      extent: eraEndDate.Extent,
    })
  }

  // VisitLength - NumericRange
  if (
    criteriaObj.VisitLength &&
    typeof criteriaObj.VisitLength === 'object' &&
    criteriaObj.VisitLength !== null
  ) {
    const visitLength = criteriaObj.VisitLength as { Op: string; Value: number; Extent?: number }
    attributes.push({
      type: 'numericRange',
      attributeKey: 'visitLength',
      operator: convertAtlasToOperator(
        visitLength.Op
      ) as import('@/models/event.types').NumericOperator,
      value: visitLength.Value,
      extent: visitLength.Extent,
    })
  }

  // EraLength - NumericRange
  if (
    criteriaObj.EraLength &&
    typeof criteriaObj.EraLength === 'object' &&
    criteriaObj.EraLength !== null
  ) {
    const eraLength = criteriaObj.EraLength as { Op: string; Value: number; Extent?: number }
    attributes.push({
      type: 'numericRange',
      attributeKey: 'eraLength',
      operator: convertAtlasToOperator(
        eraLength.Op
      ) as import('@/models/event.types').NumericOperator,
      value: eraLength.Value,
      extent: eraLength.Extent,
    })
  }

  // Quantity - NumericRange
  if (
    criteriaObj.Quantity &&
    typeof criteriaObj.Quantity === 'object' &&
    criteriaObj.Quantity !== null
  ) {
    const quantity = criteriaObj.Quantity as { Op: string; Value: number; Extent?: number }
    attributes.push({
      type: 'numericRange',
      attributeKey: 'quantity',
      operator: convertAtlasToOperator(
        quantity.Op
      ) as import('@/models/event.types').NumericOperator,
      value: quantity.Value,
      extent: quantity.Extent,
    })
  }

  // VisitType - Concept array
  if (
    criteriaObj.VisitType &&
    Array.isArray(criteriaObj.VisitType) &&
    criteriaObj.VisitType.length > 0
  ) {
    attributes.push(
      parseConceptAttribute(
        'visitType',
        criteriaObj.VisitType,
        criteriaObj.VisitTypeExclude as boolean | undefined
      )
    )
  }
  {
    const cs = parseConceptSetAttribute('visitTypeCs', criteriaObj.VisitTypeCS)
    if (cs) attributes.push(cs)
  }

  // ProviderSpecialty - Concept array
  if (
    criteriaObj.ProviderSpecialty &&
    Array.isArray(criteriaObj.ProviderSpecialty) &&
    criteriaObj.ProviderSpecialty.length > 0
  ) {
    attributes.push(
      parseConceptAttribute(
        'providerSpecialty',
        criteriaObj.ProviderSpecialty,
        criteriaObj.ProviderSpecialtyExclude as boolean | undefined
      )
    )
  }
  {
    const cs = parseConceptSetAttribute('providerSpecialtyCs', criteriaObj.ProviderSpecialtyCS)
    if (cs) attributes.push(cs)
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
  if (
    criteriaObj.TemporalRelationship &&
    typeof criteriaObj.TemporalRelationship === 'object' &&
    criteriaObj.TemporalRelationship !== null
  ) {
    const temporalRelationship = criteriaObj.TemporalRelationship as { StartWindow?: unknown }
    if (temporalRelationship.StartWindow) {
      attributes.push(
        parseTemporalRelationshipAttribute(
          'temporalRelationship',
          temporalRelationship as Parameters<typeof parseTemporalRelationshipAttribute>[1]
        )
      )
    }
  }

  // DateAdjustment - Date adjustment attribute
  if (
    criteriaObj.DateAdjustment &&
    typeof criteriaObj.DateAdjustment === 'object' &&
    criteriaObj.DateAdjustment !== null
  ) {
    const dateAdjustment = criteriaObj.DateAdjustment as { StartWith?: string }
    if (dateAdjustment.StartWith) {
      attributes.push(
        parseDateAdjustmentAttribute(
          'dateAdjustment',
          dateAdjustment as Parameters<typeof parseDateAdjustmentAttribute>[1]
        )
      )
    }
  }

  // UserDefinedPeriod - Custom period with start and end dates
  if (
    typeof criteriaObj.PeriodStartDate === 'string' &&
    typeof criteriaObj.PeriodEndDate === 'string'
  ) {
    attributes.push(
      parseUserDefinedPeriodAttribute(
        'userDefinedPeriod',
        criteriaObj.PeriodStartDate,
        criteriaObj.PeriodEndDate
      )
    )
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
 * Convert internal CensorWindow to Atlas format. Atlas serializes
 * StartDate/EndDate as ISO date strings (yyyy-mm-dd) or null.
 */
function convertCensorWindowToAtlas(cw: CensorWindow): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  if (cw.startDate !== undefined) {
    result.StartDate = cw.startDate ?? null
  }
  if (cw.endDate !== undefined) {
    result.EndDate = cw.endDate ?? null
  }
  return result
}

/**
 * Convert Atlas CensorWindow to internal format. Accepts the legacy
 * date-field+offset shape from older Atlas3 cohorts and degrades it
 * to undefined dates so loading old data does not crash.
 */
function convertCensorWindowFromAtlas(atlasCw: Record<string, unknown>): CensorWindow {
  const cw: CensorWindow = {}
  if (typeof atlasCw.StartDate === 'string' || atlasCw.StartDate === null) {
    cw.startDate = atlasCw.StartDate as string | null
  }
  if (typeof atlasCw.EndDate === 'string' || atlasCw.EndDate === null) {
    cw.endDate = atlasCw.EndDate as string | null
  }
  return cw
}

// Helpers
function convertToPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Atlas 2.15 uses uppercase "CS" for concept-set variant fields (e.g. VisitTypeCS),
// but our internal keys camelCase the suffix as "Cs" (e.g. visitTypeCs).
function attributeKeyToAtlasField(key: string): string {
  const pascal = convertToPascalCase(key)
  return pascal.endsWith('Cs') ? pascal.slice(0, -2) + 'CS' : pascal
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
