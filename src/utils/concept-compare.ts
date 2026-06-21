import type { Concept, ComparisonResultItem } from '@/models/concept-set.types'

/**
 * Diff two concept lists by `conceptId` into the shared ComparisonResultItem
 * shape (left-only / right-only / both). Used for the client-side Compare modes
 * (expression concepts and source codes); the included-concepts mode is diffed
 * server-side by the WebAPI compare endpoint.
 */
export function diffConceptLists(list1: Concept[], list2: Concept[]): ComparisonResultItem[] {
  const m1 = new Map(list1.map(c => [c.conceptId, c]))
  const m2 = new Map(list2.map(c => [c.conceptId, c]))
  const ids = new Set<number>([...m1.keys(), ...m2.keys()])

  const rows: ComparisonResultItem[] = []
  for (const id of ids) {
    const a = m1.get(id)
    const b = m2.get(id)
    const src = (a ?? b) as Concept
    rows.push({
      conceptId: id,
      conceptIn1Only: a && !b ? 1 : 0,
      conceptIn2Only: b && !a ? 1 : 0,
      conceptIn1And2: a && b ? 1 : 0,
      conceptName: src.conceptName,
      conceptCode: src.conceptCode,
      conceptClassId: src.conceptClassId,
      domainId: src.domainId,
      vocabularyId: src.vocabularyId,
      standardConcept: src.standardConcept ?? null,
      invalidReason: src.invalidReason ?? null,
      validStartDate: null,
      validEndDate: null,
      nameMismatch: !!(a && b && a.conceptName !== b.conceptName),
    })
  }
  return rows
}
