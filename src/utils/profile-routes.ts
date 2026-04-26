export function profileRouteFor(
  sourceKey: string,
  personId: number | string,
  cohortId?: number
): string {
  const base = `/profiles/${encodeURIComponent(sourceKey)}/${encodeURIComponent(String(personId))}`
  return cohortId !== undefined ? `${base}/${cohortId}` : base
}
