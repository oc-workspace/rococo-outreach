const scopeKeyPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function getOutreachWorkspaceKey(rawValue = process.env.OUTREACH_WORKSPACE_KEY): string {
  return normalizeScopeKey(rawValue) ?? 'default';
}

export function getOutreachTeamKey(rawValue = process.env.OUTREACH_TEAM_KEY): string {
  return normalizeScopeKey(rawValue) ?? 'outreach';
}

export function normalizeScopeKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return scopeKeyPattern.test(normalized) ? normalized : null;
}
