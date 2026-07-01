import type { EmailContact, EmailDraft, RecipientRow, RenderedEmail } from './types';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>(\n)?/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function replaceTokens(value: string, contact: EmailContact | undefined, row: RecipientRow) {
  const tokens: Record<string, string> = {
    salutation: row.salutation || contact?.salutation || '',
    displayName: contact?.displayName || row.email,
    company: contact?.company || '',
    mediaName: contact?.mediaName || contact?.company || '',
    language: row.language || contact?.language || '',
    email: row.email,
  };
  return value.replace(/{{\s*(salutation|displayName|company|mediaName|language|email)\s*}}/g, (_, key: string) => tokens[key] || '');
}

export function renderRecipientEmail(draft: EmailDraft, row: RecipientRow, contacts: EmailContact[]): RenderedEmail {
  const contact = contacts.find((item) => item.id === row.contactId || item.email === row.email);
  const warnings: string[] = [];
  if (!row.email || !emailPattern.test(row.email)) warnings.push('Invalid or missing recipient email.');
  if (!row.salutation) warnings.push('Missing salutation.');
  if (!row.language) warnings.push('Missing language.');
  if (contact?.status === 'blocked') warnings.push('Contact is blocked.');
  if (contact?.status === 'inactive') warnings.push('Contact is inactive.');
  const subject = replaceTokens(draft.subject, contact, row);
  const bodyHtml = replaceTokens(draft.bodyHtml, contact, row);
  return { rowId: row.id, contactId: contact?.id, to: row.email, subject, salutation: row.salutation, bodyHtml, bodyText: htmlToText(bodyHtml), warnings };
}

export function hasDuplicateRecipients(rows: RecipientRow[]) {
  const seen = new Set<string>();
  return rows.some((row) => {
    const email = row.email.trim().toLowerCase();
    if (!email) return false;
    if (seen.has(email)) return true;
    seen.add(email);
    return false;
  });
}
