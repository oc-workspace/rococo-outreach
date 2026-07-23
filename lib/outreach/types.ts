export type ContactStatus = 'active' | 'inactive' | 'blocked';
export type LanguageCode = 'zh' | 'en' | 'ja' | string;
export type CampaignStatus = 'draft' | 'previewed' | 'sending' | 'sent' | 'partial_failed' | 'cancelled';
export type DeliveryStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'bounced' | 'replied';
export type SenderStatus = 'active' | 'inactive' | 'disabled';

export interface EmailContact {
  id: string;
  email: string;
  displayName: string;
  salutation: string;
  language: LanguageCode;
  company: string;
  mediaName: string;
  role: string;
  country: string;
  tags: string[];
  notes: string;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmailDraft {
  id: string;
  title: string;
  subject: string;
  bodyHtml: string;
  status: 'draft' | 'ready';
  createdAt: string;
  updatedAt: string;
}

export interface RecipientRow {
  id: string;
  contactId: string;
  email: string;
  language: LanguageCode;
  salutation: string;
}

export interface EmailSender {
  id: string;
  displayName: string;
  email: string;
  domain: string;
  domainVerified: boolean;
  senderVerified: boolean;
  status: SenderStatus;
}

export interface RenderedEmail {
  rowId: string;
  contactId?: string;
  to: string;
  subject: string;
  salutation: string;
  bodyHtml: string;
  bodyText: string;
  warnings: string[];
}

export interface DeliveryRecord extends RenderedEmail {
  id: string;
  sendStatus: DeliveryStatus;
  providerMessageId?: string;
  errorMessage?: string;
  sentAt?: string;
}

export interface CampaignRecord {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  senderEmail: string;
  senderName: string;
  replyToEmail: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  repliedCount: number;
  status: CampaignStatus;
  createdAt: string;
  sentAt?: string;
  deliveries: DeliveryRecord[];
}
