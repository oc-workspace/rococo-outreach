import { prisma } from '@/lib/db/prisma';
import { createTencentEnterpriseMailTransport, readTencentEnterpriseMailConfig } from '@/lib/mail/transportFactory';
import type { RenderedEmail } from './types';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxRecipients = 50;

export interface SendCampaignInput {
  name: string;
  subject: string;
  bodyHtml: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  replyToEmail: string;
  deliveries: Array<Pick<RenderedEmail, 'contactId' | 'to' | 'subject' | 'bodyHtml' | 'bodyText' | 'salutation'> & { warnings?: string[] }>;
}

export class CampaignSendError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'CampaignSendError';
  }
}

export async function sendAndPersistCampaign(input: SendCampaignInput) {
  if (!input || typeof input !== 'object') throw new CampaignSendError(400, 'Invalid campaign payload');
  if (typeof input.senderId !== 'string' || typeof input.senderEmail !== 'string' || typeof input.senderName !== 'string' || typeof input.replyToEmail !== 'string') {
    throw new CampaignSendError(400, 'Sender fields are required');
  }
  if (typeof input.name !== 'string' || typeof input.subject !== 'string' || typeof input.bodyHtml !== 'string') {
    throw new CampaignSendError(400, 'Campaign name, subject, and body are required');
  }
  if (!Array.isArray(input.deliveries)) throw new CampaignSendError(400, 'Deliveries are required');

  const sender = await prisma.emailSender.findUnique({ where: { id: input.senderId } });
  if (!sender) throw new CampaignSendError(404, 'Selected sender was not found');
  if (sender.status !== 'active' || !sender.domainVerified || !sender.senderVerified) {
    throw new CampaignSendError(409, 'Selected sender is not eligible for sending');
  }

  const config = readTencentEnterpriseMailConfig();
  const senderEmail = input.senderEmail.trim().toLowerCase();
  const configuredMailbox = config.user.trim().toLowerCase();
  if (sender.email.trim().toLowerCase() !== senderEmail || senderEmail !== configuredMailbox) {
    throw new CampaignSendError(409, 'Selected sender does not match the connected SMTP mailbox');
  }

  const name = input.name.trim();
  const subject = input.subject.trim();
  const bodyHtml = input.bodyHtml.trim();
  const senderName = input.senderName.trim();
  const replyToEmail = input.replyToEmail.trim().toLowerCase();
  if (!name || !subject || !bodyHtml || !senderName) throw new CampaignSendError(400, 'Campaign name, subject, body, and sender name are required');
  if (!emailPattern.test(senderEmail) || !emailPattern.test(replyToEmail)) throw new CampaignSendError(400, 'Sender and reply-to email must be valid');
  if (replyToEmail !== senderEmail) throw new CampaignSendError(409, 'Reply-to must match the connected sender mailbox');
  if (!Array.isArray(input.deliveries) || input.deliveries.length === 0) throw new CampaignSendError(400, 'At least one delivery is required');
  if (input.deliveries.length > maxRecipients) throw new CampaignSendError(400, `A campaign may contain at most ${maxRecipients} recipients`);

  const normalizedDeliveries = input.deliveries.map((delivery, index) => {
    const toEmail = String(delivery.to || '').trim().toLowerCase();
    const renderedSubject = String(delivery.subject || '').trim();
    const renderedBodyHtml = String(delivery.bodyHtml || '').trim();
    const renderedBodyText = String(delivery.bodyText || '').trim();
    const salutation = String(delivery.salutation || '').trim();
    if (!emailPattern.test(toEmail)) throw new CampaignSendError(400, `Delivery ${index + 1} has an invalid recipient email`);
    if (!renderedSubject || !renderedBodyHtml || !renderedBodyText) throw new CampaignSendError(400, `Delivery ${index + 1} is missing rendered content`);
    if (Array.isArray(delivery.warnings) && delivery.warnings.length > 0) throw new CampaignSendError(400, `Delivery ${index + 1} has unresolved warnings`);
    return { contactId: delivery.contactId || null, toEmail, renderedSubject, renderedBodyHtml, renderedBodyText, salutation };
  });

  const seen = new Set<string>();
  for (const delivery of normalizedDeliveries) {
    if (seen.has(delivery.toEmail)) throw new CampaignSendError(400, 'Duplicate recipient emails are not allowed');
    seen.add(delivery.toEmail);
  }

  const transport = createTencentEnterpriseMailTransport();
  const campaign = await prisma.emailCampaign.create({
    data: {
      name,
      subject,
      bodyHtml,
      senderId: sender.id,
      senderEmail,
      senderName,
      replyToEmail,
      totalCount: normalizedDeliveries.length,
      status: 'sending',
      deliveries: { create: normalizedDeliveries },
    },
    include: { deliveries: { orderBy: { createdAt: 'asc' } } },
  });

  let successCount = 0;
  let failedCount = 0;
  for (const delivery of campaign.deliveries) {
    await prisma.emailCampaignDelivery.update({ where: { id: delivery.id }, data: { sendStatus: 'sending' } });
    try {
      const result = await transport.send({
        from: senderEmail,
        replyTo: replyToEmail,
        to: delivery.toEmail,
        subject: delivery.renderedSubject,
        html: delivery.renderedBodyHtml,
        text: delivery.renderedBodyText,
      });
      const accepted = result.accepted.some((value) => value.trim().toLowerCase() === delivery.toEmail) && result.rejected.length === 0;
      if (!accepted) {
        failedCount += 1;
        await prisma.emailCampaignDelivery.update({ where: { id: delivery.id }, data: { sendStatus: 'failed', errorMessage: 'SMTP rejected recipient' } });
        continue;
      }
      successCount += 1;
      await prisma.emailCampaignDelivery.update({ where: { id: delivery.id }, data: { sendStatus: 'sent', providerMessageId: result.messageId, sentAt: new Date() } });
    } catch (error) {
      failedCount += 1;
      await prisma.emailCampaignDelivery.update({ where: { id: delivery.id }, data: { sendStatus: 'failed', errorMessage: safeSendError(error) } });
    }
  }

  return prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: { successCount, failedCount, status: failedCount > 0 ? 'partial_failed' : 'sent', sentAt: new Date() },
    include: { deliveries: { orderBy: { createdAt: 'asc' } } },
  });
}

function safeSendError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'SMTP send failed';
  const value = error as { code?: unknown; command?: unknown };
  const code = typeof value.code === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(value.code) ? value.code : '';
  const command = typeof value.command === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(value.command) ? value.command : '';
  if (code && command) return `SMTP send failed (${code}/${command})`;
  if (code) return `SMTP send failed (${code})`;
  return 'SMTP send failed';
}
