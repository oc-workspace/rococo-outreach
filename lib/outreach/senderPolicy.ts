const defaultAllowedSenderDomains = ['next2p.com'];

export function readAllowedSenderDomains(rawValue = process.env.OUTREACH_ALLOWED_SENDER_DOMAINS): string[] {
  const values = rawValue?.trim() ? rawValue.split(',') : defaultAllowedSenderDomains;
  return Array.from(new Set(values.map(normalizeDomain).filter((value): value is string => Boolean(value))));
}

export function getEmailDomain(email: string): string | null {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(normalizedEmail)) return null;
  const separator = normalizedEmail.lastIndexOf('@');
  return normalizeDomain(normalizedEmail.slice(separator + 1));
}

export function isAllowedSenderEmail(email: string, allowedDomains = readAllowedSenderDomains()): boolean {
  const domain = getEmailDomain(email);
  return Boolean(domain && allowedDomains.includes(domain));
}

function normalizeDomain(value: string): string | null {
  const domain = value.trim().toLowerCase().replace(/^@/, '');
  if (!domain || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain)) return null;
  return domain;
}
