import { Prisma, type PrismaClient } from '@prisma/client';

export type CampaignAuditAction =
  | 'campaign_queued'
  | 'campaign_cancel_requested'
  | 'campaign_retry_queued'
  | 'delivery_claimed'
  | 'delivery_sent'
  | 'delivery_failed'
  | 'delivery_cancelled'
  | 'delivery_recovered'
  | 'campaign_completed';

export async function writeCampaignAudit(
  client: PrismaClient,
  input: {
    campaignId?: string;
    deliveryId?: string;
    action: CampaignAuditAction;
    actor?: string;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await client.emailCampaignAuditLog.create({
      data: {
        campaignId: input.campaignId,
        deliveryId: input.deliveryId,
        action: input.action,
        actor: input.actor?.trim() || 'operator',
        details: input.details ? sanitizeDetails(input.details) : undefined,
      },
    });
  } catch (error) {
    console.error('Campaign audit log write failed', error instanceof Error ? error.message : 'Unknown audit error');
  }
}

function sanitizeDetails(details: Record<string, unknown>): Prisma.InputJsonObject {
  return Object.fromEntries(Object.entries(details).map(([key, value]) => {
    if (/email|address|body|html|text|password|token|secret/i.test(key)) return [key, '[redacted]'];
    if (typeof value === 'string') return [key, value.slice(0, 240)];
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) return [key, value];
    return [key, '[omitted]'];
  })) as Prisma.InputJsonObject;
}
