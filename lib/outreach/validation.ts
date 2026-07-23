import { htmlToText } from './render';
import type { EmailContact, EmailDraft, RecipientRow } from './types';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SendValidationMode = 'test' | 'real';

export interface SendValidationError {
  section: 'Campaign draft' | 'Recipients' | 'Test send';
  message: string;
}

export interface SendValidationInput {
  campaignName: string;
  draft: EmailDraft;
  rows: RecipientRow[];
  contacts: EmailContact[];
  senderEmail: string;
  senderName: string;
  previewed: boolean;
  testRecipientEmail: string;
  mode: SendValidationMode;
}

function isEmail(value: string) {
  return emailPattern.test(value.trim());
}

function pushMissing(errors: SendValidationError[], section: SendValidationError['section'], condition: boolean, message: string) {
  if (!condition) errors.push({ section, message });
}

export function validateCampaignSend(input: SendValidationInput) {
  const errors: SendValidationError[] = [];
  const bodyText = htmlToText(input.draft.bodyHtml);

  pushMissing(errors, 'Campaign draft', input.campaignName.trim().length > 0, 'Campaign name is required.');
  pushMissing(errors, 'Campaign draft', input.draft.subject.trim().length > 0, 'Subject is required.');
  pushMissing(errors, 'Campaign draft', bodyText.length > 0, 'Rich body HTML is required.');
  pushMissing(errors, 'Campaign draft', isEmail(input.senderEmail), 'Sender email is required.');
  pushMissing(errors, 'Campaign draft', input.senderName.trim().length > 0, 'Sender name is required.');
  pushMissing(errors, input.mode === 'test' ? 'Test send' : 'Recipients', input.previewed, 'Run preview before sending.');

  if (input.mode === 'test') {
    pushMissing(errors, 'Test send', isEmail(input.testRecipientEmail), 'Test recipient email is required.');
    return errors;
  }

  pushMissing(errors, 'Recipients', input.rows.length > 0, 'At least one recipient is required.');

  const seenEmails = new Set<string>();
  input.rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const email = row.email.trim().toLowerCase();
    const contact = input.contacts.find((item) => item.id === row.contactId || item.email.toLowerCase() === email);

    if (!isEmail(row.email)) errors.push({ section: 'Recipients', message: `Row ${rowNumber}: valid recipient email is required.` });
    if (!row.language) errors.push({ section: 'Recipients', message: `Row ${rowNumber}: language is required.` });
    if (!row.salutation.trim()) errors.push({ section: 'Recipients', message: `Row ${rowNumber}: salutation is required.` });
    if (email && seenEmails.has(email)) errors.push({ section: 'Recipients', message: `Row ${rowNumber}: duplicate recipient email.` });
    if (email) seenEmails.add(email);
    if (contact?.status === 'blocked') errors.push({ section: 'Recipients', message: `Row ${rowNumber}: contact is blocked.` });
    if (contact?.status === 'inactive') errors.push({ section: 'Recipients', message: `Row ${rowNumber}: contact is inactive.` });
  });

  return errors;
}
