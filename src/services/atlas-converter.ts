// CRITICAL: Uses ?? operator for zero-count preservation (not ||)

import type {
  CohortDefinition,
  CohortEvent,
  CensorWindow,
  CriteriaType,
  QualifyingLimit,
  LogicType,
  CriteriaGroup,
} from '@/models/cohort.types'
import type { EventAttribute, TextAttributeKey } from '@/models/event.types'
import type {
  AtlasConceptSet,
  AtlasCriteria,
  AtlasInclusionRule,
  AtlasConcept,
  ConceptSetItem,
  AtlasCriteriaTypeObject,
  AtlasConceptSetItem,
  AtlasEndStrategy,
  AtlasGroup,
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
  EndStrategy?: AtlasEndStrategy
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

    InclusionRules: cohort.inclusionRules.map(rule => {
      // The CIRCE inclusion-rule expression is a single top-level criteria
      // group: its Type/Count come from the first model group, and any further
      // model groups nest under Groups[]. Symmetric with convertAtlasToInternal.
      // (Previously Type was hardcoded 'ALL' and all groups were flattened,
      // which silently dropped AT_LEAST/AT_MOST + count — e.g. an exclusion
      // expressed as a group "AT_MOST 0" became a plain "ALL" group, and its
      // single criterion then defaulted to Occurrence AT_LEAST 1, inverting the
      // exclusion into a requirement.)
      const [firstGroup, ...restGroups] = rule.criteriaGroups
      const groupCount = (g: { count?: number }) =>
        typeof g.count === 'number' ? { Count: g.count } : {}
      return {
        name: rule.name,
        ...(rule.description ? { description: rule.description } : {}),
        expression: {
          Type: firstGroup?.logicType || 'ALL',
          ...(firstGroup ? groupCount(firstGroup) : {}),
          CriteriaList: (firstGroup?.events ?? [])
            .filter(e => e.criteriaType !== 'Demographic')
            .map(e => convertEventToAtlas(e, true)),
          DemographicCriteriaList: (firstGroup?.events ?? [])
            .filter(e => e.criteriaType === 'Demographic')
            .map(convertDemographicEventToAtlas),
          Groups: restGroups.map(g => ({
            Type: g.logicType || 'ALL',
            ...groupCount(g),
            CriteriaList: g.events
              .filter(e => e.criteriaType !== 'Demographic')
              .map(e => convertEventToAtlas(e, true)),
            // Nested groups carry their own demographics too; without this a
            // Demographic criterion in any non-first group is silently dropped.
            DemographicCriteriaList: g.events
              .filter(e => e.criteriaType === 'Demographic')
              .map(convertDemographicEventToAtlas),
          })),
        },
      }
    }),

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

    ...(() => {
      const endStrategy = cohort.exitCriteria
        ? convertExitCriteriaToAtlas(cohort.exitCriteria)
        : null
      return endStrategy ? { EndStrategy: endStrategy } : {}
    })(),
  }
}

// Returns null for "end of continuous observation": circe's EndStrategy is a
// polymorphic type, so an empty `EndStrategy: {}` fails deserialization — the
// strategy must be expressed by omitting the field entirely.
function convertExitCriteriaToAtlas(
  exit: import('@/models/cohort.types').ExitCriteria
): AtlasEndStrategy | null {
  if (exit.strategy === 'FIXED_DURATION') {
    return {
      DateOffset: {
        DateField: exit.dateField === 'END_DATE' ? 'EndDate' : 'StartDate',
        Offset: exit.offset ?? 0,
      },
    }
  }
  if (exit.strategy === 'CONTINUOUS_DRUG') {
    return {
      CustomEra: {
        DrugCodesetId: exit.conceptSet?.id as number ?? 0,
        GapDays: exit.persistenceWindow ?? 0,
        Offset: exit.offset ?? 0,
        ...(exit.surveillanceWindow != null ? { DaysSupplyOverride: exit.surveillanceWindow } : {}),
      },
    }
  }
  return null
}

function convertDemographicEventToAtlas(event: CohortEvent): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const attr of event.attributes ?? []) {
    Object.assign(out, convertAttributeToAtlas(attr))
  }
  return out
}

/**
 * Convert a CriteriaGroup (nested/correlated criteria or a sub-group) to the
 * CIRCE group shape (Type/Count/CriteriaList/DemographicCriteriaList/Groups).
 * Recurses through `nestedGroups` so sub-groups survive (#112).
 */
function convertGroupToAtlasGroup(group: CriteriaGroup): AtlasGroup {
  return {
    Type: group.logicType,
    Count: group.count,
    CriteriaList: group.events.map(e => convertEventToAtlas(e, true)),
    DemographicCriteriaList: [],
    Groups: (group.nestedGroups ?? []).map(convertGroupToAtlasGroup),
  }
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
  } else if (wrapInCriteria) {
    // Same circe-NPE-shield as the StartWindow default below: correlated
    // criteria need an Occurrence block on the wrapper. The 2.15 default
    // is "at least 1" which matches the visible UI text the user sees
    // before they expand cardinality.
    atlasEvent.Occurrence = {
      Type: 2, // AT_LEAST
      Count: 1,
      CountMethod: 'ALL',
      IsDistinct: false,
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
  } else if (wrapInCriteria) {
    // Correlated criteria (inclusion rules, additional criteria, nested
    // groups) MUST carry a StartWindow — circe's
    // CohortExpressionQueryBuilder.getCorelatedlCriteriaQuery dereferences
    // `drugEra.startWindow.start` with no null guard and NPEs otherwise.
    //
    // When the user hasn't explicitly added a temporal window, fall back
    // to "any time during observation": Coeff -1 / +1 with no Days bound,
    // matching ATLAS 2.x's representation of an unbounded window. The
    // dedicated long-term-baseline default (-365 to 0) only kicks in when
    // the user clicks "Add temporal window" in the criterion editor — so
    // a freshly-added criterion behaves as "any time" until the user
    // explicitly narrows it.
    atlasEvent.StartWindow = {
      Start: { Coeff: -1 },
      End: { Coeff: 1 },
      UseIndexEnd: false,
      UseEventEnd: false,
    }
  }

  // Write EndWindow if present
  if (event.endTemporalWindow) {
    const etw = event.endTemporalWindow
    const endStartDays = etw.startWindow?.days
    const endEndDays = etw.endWindow?.days
    atlasEvent.EndWindow = {
      Start: etw.startWindow
        ? {
            ...(endStartDays !== null && endStartDays !== undefined ? { Days: endStartDays } : {}),
            Coeff: etw.startWindow.beforeAfter === 'AFTER' ? 1 : -1,
          }
        : { Coeff: -1 },
      End: etw.endWindow
        ? {
            ...(endEndDays !== null && endEndDays !== undefined ? { Days: endEndDays } : {}),
            Coeff: etw.endWindow.beforeAfter === 'AFTER' ? 1 : -1,
          }
        : { Coeff: 1 },
      UseIndexEnd: etw.startWindow?.referencePoint === 'INDEX_END',
      UseEventEnd: etw.startWindow?.referencePoint === 'EVENT_END',
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
    // CIRCE nests CorrelatedCriteria inside the criteria-type object itself
    // (e.g. Measurement.CorrelatedCriteria), not as a sibling of it — see #131.
    criteriaTypeObj.CorrelatedCriteria = convertGroupToAtlasGroup(event.nestedCriteria)
  }

  return atlasEvent
}

function convertTextAttribute(attributeKey: string, value: string, operator?: string): Record<string, unknown> {
  const attributeName = convertToPascalCase(attributeKey)
  return {
    [attributeName]: {
      Text: value,
      Op: operator ? convertOperatorToAtlasText(operator) : 'contains',
    },
  }
}

function convertOperatorToAtlasText(op: string): string {
  const map: Record<string, string> = {
    CONTAINS: 'contains',
    EQUALS: 'eq',
    STARTS_WITH: 'startsWith',
    ENDS_WITH: 'endsWith',
  }
  return map[op] || 'contains'
}

export function parseTextAttribute(attributeKey: string, value: string): EventAttribute {
  return {
    type: 'text',
    attributeKey: attributeKey as 'valueAsString',
    operator: 'CONTAINS',
    value,
  }
}

function parseTextFilterAttribute(
  attributeKey: string,
  raw: unknown
): EventAttribute | null {
  if (typeof raw === 'string') {
    return {
      type: 'text',
      attributeKey: attributeKey as 'valueAsString',
      operator: 'CONTAINS',
      value: raw,
    }
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const filter = raw as { Text?: string; Op?: string }
    if (filter.Text != null) {
      const opMap: Record<string, 'CONTAINS' | 'EQUALS' | 'STARTS_WITH' | 'ENDS_WITH'> = {
        contains: 'CONTAINS',
        eq: 'EQUALS',
        startsWith: 'STARTS_WITH',
        endsWith: 'ENDS_WITH',
      }
      return {
        type: 'text' as const,
        attributeKey: attributeKey as TextAttributeKey,
        operator: (filter.Op ? opMap[filter.Op] : 'CONTAINS') ?? 'CONTAINS',
        value: filter.Text,
      }
    }
  }
  return null
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
    return convertTextAttribute(attr.attributeKey, attr.value, attr.operator)
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

    exitCriteria: atlas.EndStrategy ? convertAtlasEndStrategy(atlas.EndStrategy) : undefined,

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
            ...(typeof rule.expression.Count === 'number'
              ? { count: rule.expression.Count }
              : {}),
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
              ...(typeof rule.expression.Count === 'number'
                ? { count: rule.expression.Count }
                : {}),
              events: demographicEvents,
            })
          }
        }

        if (rule.expression?.Groups && rule.expression.Groups.length > 0) {
          criteriaGroups.push(
            ...rule.expression.Groups.map((group: import('@/models/atlas.types').AtlasGroup) => ({
              id: generateId(),
              logicType: (group.Type || 'ALL') as LogicType,
              ...(typeof group.Count === 'number' ? { count: group.Count } : {}),
              events: [
                ...(group.CriteriaList?.map((e: AtlasCriteria) =>
                  convertAtlasToEvent(e, atlas.ConceptSets)
                ) || []),
                // Symmetric with the write side: a nested group's demographics
                // live alongside its criteria in the internal model.
                ...((group.DemographicCriteriaList as Array<Record<string, unknown>>)?.map(dc =>
                  convertDemographicCriteriaToEvent(dc)
                ) || []),
              ],
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

/** CIRCE group shape as seen on the way back in (correlated criteria / sub-group). */
interface AtlasGroupShape {
  Type?: string
  Count?: number
  CriteriaList?: AtlasCriteria[]
  Groups?: AtlasGroupShape[]
}

/**
 * Convert a CIRCE group (correlated criteria or sub-group) back to a
 * CriteriaGroup, recursing through `Groups` so sub-groups survive (#112).
 */
function convertAtlasGroupToGroup(
  group: AtlasGroupShape,
  conceptSets?: AtlasConceptSet[]
): CriteriaGroup {
  const nestedGroups = (group.Groups ?? []).map(g => convertAtlasGroupToGroup(g, conceptSets))
  return {
    id: generateId(),
    logicType: (group.Type as LogicType) || 'ALL',
    count: group.Count,
    events: group.CriteriaList?.map((e: AtlasCriteria) => convertAtlasToEvent(e, conceptSets)) || [],
    ...(nestedGroups.length > 0 ? { nestedGroups } : {}),
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
      'DoseEra',
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

  // Atlas EndWindow (separate from StartWindow — constrains event end date)
  const atlasEndWindow = (atlasEvent as Record<string, unknown>).EndWindow as typeof startWindow | undefined
  if (atlasEndWindow) {
    event.endTemporalWindow = {
      startWindow: atlasEndWindow.Start
        ? {
            days: atlasEndWindow.Start.Days !== undefined ? atlasEndWindow.Start.Days : null,
            beforeAfter: (atlasEndWindow.Start.Coeff ?? 1) < 0 ? 'BEFORE' : 'AFTER',
            referencePoint: atlasEndWindow.UseIndexEnd
              ? 'INDEX_END'
              : atlasEndWindow.UseEventEnd
                ? 'EVENT_END'
                : 'INDEX_START',
          }
        : undefined,
      endWindow: atlasEndWindow.End
        ? {
            days: atlasEndWindow.End.Days !== undefined ? atlasEndWindow.End.Days : null,
            beforeAfter: (atlasEndWindow.End.Coeff ?? 1) < 0 ? 'BEFORE' : 'AFTER',
            referencePoint: atlasEndWindow.UseIndexEnd
              ? 'INDEX_END'
              : atlasEndWindow.UseEventEnd
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

  // CIRCE nests CorrelatedCriteria inside the criteria-type object itself
  // (e.g. Measurement.CorrelatedCriteria), not as a sibling of it — see #131.
  const criteriaObjWithCorrelatedCriteria = criteriaObj as { CorrelatedCriteria?: AtlasGroupShape }
  const correlatedCriteria = criteriaObjWithCorrelatedCriteria.CorrelatedCriteria
  if (correlatedCriteria) {
    event.nestedCriteria = convertAtlasGroupToGroup(correlatedCriteria, conceptSets)
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

  // ValueAsString - Text (may be plain string or TextFilter object)
  if (criteriaObj.ValueAsString != null) {
    const parsed = parseTextFilterAttribute('valueAsString', criteriaObj.ValueAsString)
    if (parsed) attributes.push(parsed)
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

  // StopReason - TextFilter (DrugExposure)
  if (criteriaObj.StopReason != null) {
    const parsed = parseTextFilterAttribute('stopReason', criteriaObj.StopReason)
    if (parsed) attributes.push(parsed)
  }

  // Sig - TextFilter (DrugExposure)
  if (criteriaObj.Sig != null) {
    const parsed = parseTextFilterAttribute('sig', criteriaObj.Sig)
    if (parsed) attributes.push(parsed)
  }

  // SourceCode - TextFilter
  if (criteriaObj.SourceCode != null) {
    const parsed = parseTextFilterAttribute('sourceCode', criteriaObj.SourceCode)
    if (parsed) attributes.push(parsed)
  }

  // LotNumber - TextFilter (Specimen)
  if (criteriaObj.LotNumber != null) {
    const parsed = parseTextFilterAttribute('lotNumber', criteriaObj.LotNumber)
    if (parsed) attributes.push(parsed)
  }

  // UniqueDeviceId - TextFilter (DeviceExposure)
  if (criteriaObj.UniqueDeviceId != null) {
    const parsed = parseTextFilterAttribute('deviceId', criteriaObj.UniqueDeviceId)
    if (parsed) attributes.push(parsed)
  }

  // PayerPlanPeriod concept-set attributes (CodesetId references)
  for (const [field, attrKey] of [
    ['PayerConcept', 'payerConcept'],
    ['PlanConcept', 'planConcept'],
    ['SponsorConcept', 'sponsorConcept'],
    ['StopReasonConcept', 'stopReasonConcept'],
    ['PayerSourceConcept', 'payerSourceConcept'],
    ['PlanSourceConcept', 'planSourceConcept'],
    ['SponsorSourceConcept', 'sponsorSourceConcept'],
    ['StopReasonSourceConcept', 'stopReasonSourceConcept'],
  ] as const) {
    if (typeof criteriaObj[field] === 'number') {
      attributes.push({
        type: 'conceptSet',
        attributeKey: attrKey,
        conceptSet: { id: criteriaObj[field] as number, name: '' },
      } as EventAttribute)
    }
  }

  // PeriodType - Concept array (ObservationPeriod)
  if (criteriaObj.PeriodType && Array.isArray(criteriaObj.PeriodType) && (criteriaObj.PeriodType as unknown[]).length > 0) {
    attributes.push(
      parseConceptAttribute('periodType', criteriaObj.PeriodType as unknown[], criteriaObj.PeriodTypeExclude as boolean | undefined)
    )
  }
  {
    const cs = parseConceptSetAttribute('periodTypeCs', criteriaObj.PeriodTypeCS)
    if (cs) attributes.push(cs)
  }

  // VisitDetailTypeCS - Concept set (VisitDetail)
  {
    const cs = parseConceptSetAttribute('visitDetailTypeCs', criteriaObj.VisitDetailTypeCS)
    if (cs) attributes.push(cs)
  }

  // PlaceOfServiceLocation - numeric reference (LocationRegion CodesetId)
  if (typeof criteriaObj.PlaceOfServiceLocation === 'number') {
    attributes.push({
      type: 'conceptSet',
      attributeKey: 'placeOfServiceLocation',
      conceptSet: { id: criteriaObj.PlaceOfServiceLocation as number, name: '' },
    } as EventAttribute)
  }

  // SourceId - TextFilter (Specimen)
  if (criteriaObj.SourceId != null) {
    const parsed = parseTextFilterAttribute('sourceId', criteriaObj.SourceId)
    if (parsed) attributes.push(parsed)
  }

  // MeasurementType / ObservationType / DrugType / ProcedureType / DeviceType /
  // DeathType / SpecimenType — Concept arrays with optional CS variants.
  // These follow the same pattern as ConditionType.
  for (const [key, csKey, excludeKey] of [
    ['MeasurementType', 'MeasurementTypeCS', 'MeasurementTypeExclude'],
    ['ObservationType', 'ObservationTypeCS', 'ObservationTypeExclude'],
    ['DrugType', 'DrugTypeCS', 'DrugTypeExclude'],
    ['ProcedureType', 'ProcedureTypeCS', 'ProcedureTypeExclude'],
    ['DeviceType', 'DeviceTypeCS', 'DeviceTypeExclude'],
    ['DeathType', 'DeathTypeCS', 'DeathTypeExclude'],
    ['SpecimenType', 'SpecimenTypeCS', 'SpecimenTypeExclude'],
    ['Unit', 'UnitCS', 'UnitExclude'],
    ['Operator', 'OperatorCS', 'OperatorExclude'],
    ['ValueAsConcept', 'ValueAsConceptCS', 'ValueAsConceptExclude'],
    ['RouteConcept', 'RouteConceptCS', 'RouteConceptExclude'],
    ['DoseUnit', 'DoseUnitCS', 'DoseUnitExclude'],
    ['Modifier', 'ModifierCS', 'ModifierExclude'],
    ['Qualifier', 'QualifierCS', 'QualifierExclude'],
    ['PlaceOfService', 'PlaceOfServiceCS', 'PlaceOfServiceExclude'],
    ['AnatomicSite', 'AnatomicSiteCS', 'AnatomicSiteExclude'],
    ['DiseaseStatus', 'DiseaseStatusCS', 'DiseaseStatusExclude'],
  ] as const) {
    const attrKey = key.charAt(0).toLowerCase() + key.slice(1)
    if (criteriaObj[key] && Array.isArray(criteriaObj[key]) && (criteriaObj[key] as unknown[]).length > 0) {
      attributes.push(
        parseConceptAttribute(attrKey, criteriaObj[key] as unknown[], criteriaObj[excludeKey] as boolean | undefined)
      )
    }
    const csAttrKey = attrKey + 'Cs'
    const csVal = parseConceptSetAttribute(csAttrKey, criteriaObj[csKey])
    if (csVal) attributes.push(csVal)
  }

  // Refills, DaysSupply, EffectiveDrugDose, RangeLow, RangeHigh,
  // RangeLowRatio, RangeHighRatio, DoseValue, OccurrenceCount, GapDays,
  // PeriodLength, AgeAtEnd — NumericRange attributes
  for (const [field, attrKey] of [
    ['Refills', 'refills'],
    ['DaysSupply', 'daysSupply'],
    ['EffectiveDrugDose', 'effectiveDrugDose'],
    ['RangeLow', 'rangeLow'],
    ['RangeHigh', 'rangeHigh'],
    ['RangeLowRatio', 'rangeLowRatio'],
    ['RangeHighRatio', 'rangeHighRatio'],
    ['DoseValue', 'doseValue'],
    ['OccurrenceCount', 'occurrenceCount'],
    ['GapDays', 'gapDays'],
    ['PeriodLength', 'periodLength'],
    ['AgeAtEnd', 'ageAtEnd'],
    ['VisitDetailLength', 'visitDetailLength'],
    ['PlaceOfServiceDistance', 'placeOfServiceDistance'],
  ] as const) {
    if (criteriaObj[field] && typeof criteriaObj[field] === 'object' && criteriaObj[field] !== null) {
      const val = criteriaObj[field] as { Op: string; Value: number; Extent?: number }
      attributes.push({
        type: 'numericRange',
        attributeKey: attrKey,
        operator: convertAtlasToOperator(val.Op) as import('@/models/event.types').NumericOperator,
        value: val.Value,
        extent: val.Extent,
      })
    }
  }

  // VisitDetailStartDate / VisitDetailEndDate / PeriodStartDate / PeriodEndDate — DateRange
  for (const [field, attrKey] of [
    ['VisitDetailStartDate', 'visitDetailStartDate'],
    ['VisitDetailEndDate', 'visitDetailEndDate'],
    ['PeriodStartDate', 'periodStartDate'],
    ['PeriodEndDate', 'periodEndDate'],
    ['VisitStartDate', 'visitStartDate'],
    ['VisitEndDate', 'visitEndDate'],
    ['StartDate', 'startDate'],
    ['EndDate', 'endDate'],
  ] as const) {
    if (criteriaObj[field] && typeof criteriaObj[field] === 'object' && criteriaObj[field] !== null) {
      const val = criteriaObj[field] as { Op: string; Value: string; Extent?: string }
      attributes.push({
        type: 'dateRange',
        attributeKey: attrKey,
        operator: convertAtlasToOperator(val.Op) as import('@/models/event.types').DateOperator,
        value: val.Value,
        extent: val.Extent,
      })
    }
  }

  // Primary - Boolean (Visit/Procedure)
  if (typeof criteriaObj.Primary === 'boolean') {
    attributes.push({
      type: 'boolean',
      attributeKey: 'primary',
      value: criteriaObj.Primary,
    })
  }

  // Abnormal - Boolean (Measurement)
  if (typeof criteriaObj.Abnormal === 'boolean') {
    attributes.push({
      type: 'boolean',
      attributeKey: 'abnormal',
      value: criteriaObj.Abnormal,
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

function convertAtlasEndStrategy(es: AtlasEndStrategy): import('@/models/cohort.types').ExitCriteria {
  if (es.DateOffset) {
    return {
      strategy: 'FIXED_DURATION',
      dateField: es.DateOffset.DateField === 'EndDate' ? 'END_DATE' : 'START_DATE',
      offset: es.DateOffset.Offset ?? 0,
    }
  }
  if (es.CustomEra) {
    return {
      strategy: 'CONTINUOUS_DRUG',
      conceptSet: { id: es.CustomEra.DrugCodesetId, name: '' },
      persistenceWindow: es.CustomEra.GapDays ?? 0,
      offset: es.CustomEra.Offset ?? 0,
      surveillanceWindow: (es.CustomEra as Record<string, unknown>).DaysSupplyOverride as number | undefined,
    }
  }
  return { strategy: 'CONTINUOUS_OBSERVATION' }
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
