export type ContactStatus = 'active' | 'inactive' | 'blocked';
export type LanguageCode = 'zh' | 'en' | 'ja' | string;
export type CampaignStatus = 'draft' | 'previewed' | 'queued' | 'sending' | 'paused' | 'sent' | 'partial_failed' | 'cancelled';
export type DeliveryStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'bounced' | 'replied' | 'cancelled';
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

export interface EmailTemplateRecord {
  id: string;
  templateKey: string;
  version: number;
  isCurrent: boolean;
  name: string;
  description: string;
  subject: string;
  bodyHtml: string;
  language: LanguageCode;
  purpose: string;
  tags: string[];
  status: 'active' | 'archived' | string;
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
  createdAt: string;
  updatedAt: string;
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
  attemptCount: number;
  lastAttemptAt?: string;
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
  cancelledCount: number;
  repliedCount: number;
  status: CampaignStatus;
  createdAt: string;
  sentAt?: string;
  deliveries: DeliveryRecord[];
  auditLogs: CampaignAuditLog[];
}

export interface CampaignAuditLog {
  id: string;
  action: string;
  actor: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface CampaignQueueSnapshot {
  worker: 'running' | 'starting' | 'unavailable';
  activeCampaigns: number;
  pendingDeliveries: number;
  sendingDeliveries: number;
  nextAllowedAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
}

export interface CampaignListResponse {
  data: CampaignRecord[];
}

export interface CampaignDraftRecord {
  id: string;
  workspaceKey: string;
  campaignName: string;
  draftTitle: string;
  subject: string;
  bodyHtml: string;
  senderId: string | null;
  replyToEmail: string;
  recipientRows: RecipientRow[];
  createdAt: string;
  updatedAt: string;
}
