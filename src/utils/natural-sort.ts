const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/** Orders "age group: 5 - 9" before "age group: 45 - 49", which plain string order does not. */
export function compareNatural(a: unknown, b: unknown): number {
  return collator.compare(String(a ?? ''), String(b ?? ''))
}
