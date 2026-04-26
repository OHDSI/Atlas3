export function profileRouteFor(
  sourceKey: string,
  personId: number | string,
  cohortId?: number
): string {
  const base = `/profiles/${encodeURIComponent(sourceKey)}/${personId}`
  return cohortId !== undefined ? `${base}/${cohortId}` : base
}
