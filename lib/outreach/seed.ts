import type { EmailContact, EmailDraft, EmailSender, RecipientRow } from './types';

const now = new Date().toISOString();

export const seedContacts: EmailContact[] = [
  { id: 'contact-1', email: 'editor@techdaily.example', displayName: 'Maya Chen', salutation: 'Hi Maya', language: 'en', company: 'Tech Daily', mediaName: 'Tech Daily', role: 'Editor', country: 'US', tags: ['media', 'ai'], notes: 'Prefers concise product context.', status: 'active', createdAt: now, updatedAt: now },
  { id: 'contact-2', email: 'founder@remoteletter.example', displayName: 'Kenji Sato', salutation: 'Sato-san', language: 'ja', company: 'Remote Letter', mediaName: 'Remote Letter', role: 'Founder', country: 'JP', tags: ['remote', 'newsletter'], notes: 'Often covers remote work tools.', status: 'active', createdAt: now, updatedAt: now },
  { id: 'contact-3', email: 'partnerships@blocked.example', displayName: 'Blocked Contact', salutation: '', language: 'en', company: 'Blocked Media', mediaName: 'Blocked Media', role: 'Partnerships', country: 'US', tags: ['blocked'], notes: 'Do not send until manually reactivated.', status: 'blocked', createdAt: now, updatedAt: now },
];

export const initialDraft: EmailDraft = {
  id: 'draft-1',
  title: 'Rococo intro outreach',
  subject: 'Rococo outreach preview for {{company}}',
  bodyHtml: '<p>{{salutation}},</p><p>I am sharing a short Rococo update because {{mediaName}} often covers careful career and remote-work products.</p><p>Rococo is building a quieter job discovery workflow for people who want fewer, better-matched opportunities.</p><p>Would this be relevant for your audience?</p>',
  status: 'draft',
  createdAt: now,
  updatedAt: now,
};

export const initialRecipients: RecipientRow[] = [
  { id: 'row-1', contactId: 'contact-1', email: 'editor@techdaily.example', language: 'en', salutation: 'Hi Maya' },
];

export const allowedSenders: EmailSender[] = [
  { id: 'pp-employee-1', displayName: 'Employee Name 1', email: 'employeename1@pp.com', domain: 'pp.com', domainVerified: true, senderVerified: true, status: 'active' },
  { id: 'pp-employee-2', displayName: 'Employee Name 2', email: 'employeename2@pp.com', domain: 'pp.com', domainVerified: true, senderVerified: true, status: 'active' },
];
