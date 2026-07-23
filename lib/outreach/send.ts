import type { CampaignRecord, DeliveryRecord, EmailDraft, RenderedEmail } from './types';

export function sendCampaignOneByOne(params: { name: string; draft: EmailDraft; renderedEmails: RenderedEmail[]; senderEmail: string; senderName: string; replyToEmail: string; }): CampaignRecord {
  const now = new Date().toISOString();
  const deliveries: DeliveryRecord[] = params.renderedEmails.map((email, index) => ({
    ...email,
    id: `delivery-${Date.now()}-${index}`,
    sendStatus: email.warnings.length ? 'failed' : 'sent',
    providerMessageId: email.warnings.length ? undefined : `simulated-${Date.now()}-${index}`,
    errorMessage: email.warnings.length ? email.warnings.join(' ') : undefined,
    sentAt: email.warnings.length ? undefined : now,
  }));
  const successCount = deliveries.filter((item) => item.sendStatus === 'sent').length;
  const failedCount = deliveries.filter((item) => item.sendStatus === 'failed').length;
  return {
    id: `campaign-${Date.now()}`,
    name: params.name,
    subject: params.draft.subject,
    bodyHtml: params.draft.bodyHtml,
    senderEmail: params.senderEmail,
    senderName: params.senderName,
    replyToEmail: params.replyToEmail,
    totalCount: deliveries.length,
    successCount,
    failedCount,
    repliedCount: 0,
    status: failedCount > 0 ? 'partial_failed' : 'sent',
    createdAt: now,
    sentAt: now,
    deliveries,
  };
}
