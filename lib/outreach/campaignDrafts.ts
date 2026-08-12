import type { RecipientRow } from './types';
import { sanitizeEmailHtml } from './htmlSafety';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CampaignDraftInput = {
  campaignName?: unknown;
  draftTitle?: unknown;
  subject?: unknown;
  bodyHtml?: unknown;
  senderId?: unknown;
  replyToEmail?: unknown;
  recipientRows?: unknown;
};

export type CampaignDraftData = {
  campaignName: string;
  draftTitle: string;
  subject: string;
  bodyHtml: string;
  senderId: string | null;
  replyToEmail: string;
  recipientRows: RecipientRow[];
};

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parseRows(value: unknown): { rows: RecipientRow[]; error?: string } {
  if (!Array.isArray(value)) return { rows: [], error: 'Recipient rows must be an array.' };
  if (value.length > 50) return { rows: [], error: 'A draft may contain at most 50 recipient rows.' };
  const rows: RecipientRow[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const raw = value[index];
    if (!raw || typeof raw !== 'object') return { rows: [], error: `Recipient row ${index + 1} is invalid.` };
    const item = raw as Record<string, unknown>;
    const id = text(item.id, 120);
    const contactId = text(item.contactId, 120);
    const email = text(item.email, 320);
    const language = text(item.language, 12) || 'en';
    const salutation = text(item.salutation, 240);
    if (!id) return { rows: [], error: `Recipient row ${index + 1} is missing an id.` };
    if (email && !emailPattern.test(email)) return { rows: [], error: `Recipient row ${index + 1} has an invalid email.` };
    rows.push({ id, contactId, email, language, salutation });
  }
  return { rows };
}

export function campaignDraftContent(body: CampaignDraftInput): { data?: CampaignDraftData; errors: string[] } {
  const campaignName = text(body.campaignName, 200);
  const draftTitle = text(body.draftTitle, 120);
  const subject = text(body.subject, 300);
  const bodyHtml = sanitizeEmailHtml(typeof body.bodyHtml === 'string' ? body.bodyHtml : '');
  const replyToEmail = text(body.replyToEmail, 320);
  const senderId = typeof body.senderId === 'string' && body.senderId.trim() ? text(body.senderId, 120) : null;
  const parsedRows = parseRows(body.recipientRows);
  const errors = [...(parsedRows.error ? [parsedRows.error] : [])];
  if (!campaignName) errors.push('Campaign name is required.');
  if (!draftTitle) errors.push('Draft title is required.');
  if (!subject) errors.push('Subject is required.');
  if (!bodyHtml.replace(/<[^>]*>/g, '').trim()) errors.push('Draft body is required.');
  if (replyToEmail && !emailPattern.test(replyToEmail)) errors.push('Reply-to email is invalid.');
  if (errors.length > 0) return { errors };
  return { errors: [], data: { campaignName, draftTitle, subject, bodyHtml, senderId, replyToEmail, recipientRows: parsedRows.rows } };
}

export function toCampaignDraftRecord(row: {
  id: string; workspaceKey: string; campaignName: string; draftTitle: string; subject: string;
  bodyHtml: string; senderId: string | null; replyToEmail: string; recipientRows: unknown;
  createdAt: Date; updatedAt: Date;
}) {
  const parsed = parseRows(row.recipientRows);
  return {
    id: row.id,
    workspaceKey: row.workspaceKey,
    campaignName: row.campaignName,
    draftTitle: row.draftTitle,
    subject: row.subject,
    bodyHtml: sanitizeEmailHtml(row.bodyHtml),
    senderId: row.senderId,
    replyToEmail: row.replyToEmail,
    recipientRows: parsed.rows,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
