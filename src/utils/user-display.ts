/**
 * WebAPI returns a user on an entity as either a `{ id, login, name }` object
 * or, on older records, a bare login string. Both shapes reach the UI, so a
 * caller that reads `.name` directly renders nothing for half of them.
 */
export function userDisplayName(user: unknown): string | null {
  if (!user) return null
  if (typeof user === 'string') return user.trim() || null
  const candidate = user as { name?: string | null; login?: string | null }
  return candidate.name?.trim() || candidate.login?.trim() || null
}
