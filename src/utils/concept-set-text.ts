import type { ConceptSetReference } from '@/models/cohort.types'
import type { ConceptSetItem } from '@/models/concept-set.types'

export interface ConceptSetTextLabels {
  conceptId: string
  conceptName: string
  domain: string
  vocabulary: string
  excluded: string
  descendants: string
  mapped: string
  yes: string
  no: string
}

export const DEFAULT_CONCEPT_SET_TEXT_LABELS: ConceptSetTextLabels = {
  conceptId: 'Concept Id',
  conceptName: 'Concept Name',
  domain: 'Domain',
  vocabulary: 'Vocabulary',
  excluded: 'Excluded',
  descendants: 'Descendants',
  mapped: 'Mapped',
  yes: 'YES',
  no: 'NO',
}

// Tabs and newlines inside a value would break the tab-separated layout.
function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[\t\r\n]+/g, ' ')
}

/**
 * Tab-separated listing of each concept set and its concepts, matching the
 * text ATLAS 2.15 copied from the cohort definition's Text View.
 */
export function formatConceptSetsAsText(
  conceptSets: ConceptSetReference[],
  labels: ConceptSetTextLabels = DEFAULT_CONCEPT_SET_TEXT_LABELS
): string {
  if (conceptSets.length === 0) return ''

  const header = [
    labels.conceptId,
    labels.conceptName,
    labels.domain,
    labels.vocabulary,
    labels.excluded,
    labels.descendants,
    labels.mapped,
  ].join('\t')
  const flag = (value: boolean | undefined) => (value ? labels.yes : labels.no)

  const sections = conceptSets.map(set => {
    const rows = ((set.items ?? []) as Partial<ConceptSetItem>[]).map(item =>
      [
        cell(item.conceptId),
        cell(item.conceptName),
        cell(item.domainId),
        cell(item.vocabularyId),
        flag(item.isExcluded),
        flag(item.includeDescendants),
        flag(item.includeMapped),
      ].join('\t')
    )
    return [cell(set.name), header, ...rows].join('\n')
  })

  return `${sections.join('\n\n')}\n`
}
