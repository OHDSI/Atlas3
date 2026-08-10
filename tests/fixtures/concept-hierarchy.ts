import type { RelatedConcept } from '@/models/concept-detail.types'

function row(
  conceptId: number,
  conceptName: string,
  conceptCode: string,
  conceptClassId: string,
  relationshipName: 'Has descendant of' | 'Has ancestor of',
  relationshipDistance: number
): RelatedConcept {
  return {
    conceptId,
    conceptName,
    conceptCode,
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId,
    standardConcept: 'S',
    invalidReason: null,
    relationships: [{ relationshipName, relationshipDistance }],
  }
}

const DIRECT_CHILD_SEED: Array<[number, string, string]> = [
  [4025165, 'Abscess of lung with pneumonia', '196112005'],
  [4309106, 'Aspiration pneumonia', '422588002'],
  [4236311, 'Bilateral pneumonia', '407671000'],
  [256722, 'Bronchopneumonia', '396285007'],
  [4175598, 'Catarrhal pneumonia', '50804000'],
  [43020558, 'Cavitary pneumonia', '471272001'],
  [46269693, 'Chronic pneumonia', '102361000119104'],
  [4293463, 'Community acquired pneumonia', '385093006'],
  [4048519, 'Confluent pneumonia', '123591006'],
  [255084, 'Congenital pneumonia', '78895009'],
  [1340436, 'Exacerbation of pneumonia', 'OMOP5166091'],
  [4046011, 'Focal pneumonia', '123590007'],
  [443410, 'Infective pneumonia', '312342009'],
  [45769390, 'Idiopathic eosinophilic pneumonia', '449227007'],
  [4153356, 'Postobstructive pneumonia', '428309001'],
  [4021760, 'Non-infectious pneumonia', '233606009'],
]

// 31 direct children exist in the real payload; the extra rows are synthesised so
// the truncation regression test asserts against the true count.
export const PNEUMONIA_DIRECT_CHILDREN: RelatedConcept[] = [
  ...DIRECT_CHILD_SEED.map(([id, name, code]) =>
    row(id, name, code, 'Disorder', 'Has descendant of', 1)
  ),
  ...Array.from({ length: 15 }, (_, i) =>
    row(9000000 + i, `Pneumonia variant ${i + 1}`, `900000${i}`, 'Disorder', 'Has descendant of', 1)
  ),
]

export const PNEUMONIA_DEEPER_DESCENDANTS: RelatedConcept[] = [
  row(257315, 'Bacterial pneumonia', '53084003', 'Disorder', 'Has descendant of', 2),
  row(261326, 'Viral pneumonia', '75570004', 'Disorder', 'Has descendant of', 2),
  row(4049965, 'Fungal pneumonia', '233613009', 'Disorder', 'Has descendant of', 2),
  row(4139520, 'Pneumococcal pneumonia', '233607000', 'Disorder', 'Has descendant of', 3),
]

export const PNEUMONIA_ANCESTORS: RelatedConcept[] = [
  row(253506, 'Pneumonitis', '205237003', 'Disorder', 'Has ancestor of', 1),
  row(4318404, 'Lung consolidation', '95436008', 'Disorder', 'Has ancestor of', 1),
  row(257907, 'Disorder of lung', '19829001', 'Disorder', 'Has ancestor of', 2),
]

export const PNEUMONIA_ANCESTOR_AND_DESCENDANT: RelatedConcept[] = [
  ...PNEUMONIA_ANCESTORS,
  ...PNEUMONIA_DIRECT_CHILDREN,
  ...PNEUMONIA_DEEPER_DESCENDANTS,
]

// Children of 443410 "Infective pneumonia" — what expanding that node returns.
export const INFECTIVE_PNEUMONIA_CHILDREN: RelatedConcept[] = [
  row(4049965, 'Fungal pneumonia', '233613009', 'Disorder', 'Has descendant of', 1),
  row(257315, 'Bacterial pneumonia', '53084003', 'Disorder', 'Has descendant of', 1),
  row(4050872, 'Pneumonia due to parasitic infestation', '233620002', 'Disorder', 'Has descendant of', 1),
  row(4215807, 'Infective pneumonia acquired prenatally', '71926009', 'Disorder', 'Has descendant of', 1),
  row(4143092, 'Hospital acquired pneumonia', '425464007', 'Disorder', 'Has descendant of', 1),
  row(261326, 'Viral pneumonia', '75570004', 'Disorder', 'Has descendant of', 1),
  row(3178885, 'Secondary pneumonia', '130001000004105', 'Clinical Finding', 'Has descendant of', 1),
  row(4103217, 'Pneumonia due to Chlamydia', '233609002', 'Disorder', 'Has descendant of', 1),
]

// 443410's own payload also carries its ancestors — expansion must discard them.
export const INFECTIVE_PNEUMONIA_PAYLOAD: RelatedConcept[] = [
  ...INFECTIVE_PNEUMONIA_CHILDREN,
  row(255848, 'Pneumonia', '233604007', 'Clinical Finding', 'Has ancestor of', 1),
  row(4139520, 'Pneumococcal pneumonia', '233607000', 'Disorder', 'Has descendant of', 2),
]
