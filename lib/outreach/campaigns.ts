import type { CampaignRecord, DeliveryRecord } from './types';
import { sanitizeEmailHtml } from './htmlSafety';

type DeliveryRecordRow = {
  id: string;
  contactId: string | null;
  toEmail: string;
  renderedSubject: string;
  renderedBodyHtml: string;
  renderedBodyText: string;
  salutation: string;
  sendStatus: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  attemptCount: number;
  lastAttemptAt: Date | null;
  sentAt: Date | null;
};

type CampaignRecordRow = {
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
  status: string;
  createdAt: Date;
  sentAt: Date | null;
  deliveries: DeliveryRecordRow[];
};

function toDeliveryStatus(status: string): DeliveryRecord['sendStatus'] {
  if (status === 'sending' || status === 'sent' || status === 'failed' || status === 'bounced' || status === 'replied') return status;
  return 'pending';
}

function toCampaignStatus(status: string): CampaignRecord['status'] {
  if (status === 'previewed' || status === 'sending' || status === 'sent' || status === 'partial_failed' || status === 'cancelled') return status;
  return 'draft';
}

export function toCampaignRecord(row: CampaignRecordRow): CampaignRecord {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    bodyHtml: sanitizeEmailHtml(row.bodyHtml),
    senderEmail: row.senderEmail,
    senderName: row.senderName,
    replyToEmail: row.replyToEmail,
    totalCount: row.totalCount,
    successCount: row.successCount,
    failedCount: row.failedCount,
    repliedCount: row.repliedCount,
    status: toCampaignStatus(row.status),
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString(),
    deliveries: row.deliveries.map((delivery) => ({
      id: delivery.id,
      rowId: delivery.id,
      contactId: delivery.contactId ?? undefined,
      to: delivery.toEmail,
      subject: delivery.renderedSubject,
      salutation: delivery.salutation,
      bodyHtml: sanitizeEmailHtml(delivery.renderedBodyHtml),
      bodyText: delivery.renderedBodyText,
      warnings: [],
      sendStatus: toDeliveryStatus(delivery.sendStatus),
      providerMessageId: delivery.providerMessageId ?? undefined,
      errorMessage: delivery.errorMessage ?? undefined,
      attemptCount: delivery.attemptCount,
      lastAttemptAt: delivery.lastAttemptAt?.toISOString(),
      sentAt: delivery.sentAt?.toISOString(),
    })),
  };
}
