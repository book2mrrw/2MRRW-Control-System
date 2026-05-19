/** Service role keys are JWTs; publishable/anon keys must not be used server-side. */
export function isValidSupabaseServiceRoleKey(key: string | undefined) {
  if (!key) return false;
  const trimmed = key.trim().replace(/^["']|["']$/g, "");
  return trimmed.startsWith("eyJ") && trimmed.length > 80;
}

export function normalizeServiceRoleKey(key: string | undefined) {
  if (!key) return undefined;
  return key.trim().replace(/^["']|["']$/g, "");
}
