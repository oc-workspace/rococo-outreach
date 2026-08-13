import { Prisma, type PrismaClient } from '@prisma/client';
import { createSimulatedMailTransport, isSimulatedMailTransportRequired } from '@/lib/mail/simulatedTransport';
import { createTencentEnterpriseMailTransport } from '@/lib/mail/transportFactory';
import type { MailTransport } from '@/lib/mail/transport';
import { writeCampaignAudit } from './audit';

const defaultSendIntervalMs = 6_000;
const pollIntervalMs = 1_000;
const staleDeliveryMs = 15 * 60_000;

type QueueCandidate = {
  id: string;
  campaignId: string;
  senderEmail: string;
  replyToEmail: string;
  toEmail: string;
  renderedSubject: string;
  renderedBodyHtml: string;
  renderedBodyText: string;
  simulationFailureRecipient: string | null;
  attemptCount: number;
};

type ClaimResult = {
  candidate: QueueCandidate | null;
  waitMs: number;
};

export function startCampaignQueueWorker(client: PrismaClient): void {
  const state = getQueueState();
  if (!state.worker) {
    state.worker = new CampaignQueueWorker(client);
    void state.worker.start();
  } else {
    state.worker.wake();
  }
}

class CampaignQueueWorker {
  private scheduled = false;

  constructor(private readonly client: PrismaClient) {}

  async start(): Promise<void> {
    try {
      await recoverStaleDeliveries(this.client);
      await finalizeAllCampaigns(this.client);
    } catch (error) {
      console.error('Campaign queue startup recovery failed', safeQueueError(error));
      // The app remains available when startup races database readiness.
    }
    this.schedule(250);
  }

  wake(): void {
    this.schedule(0);
  }

  private schedule(delayMs: number): void {
    if (this.scheduled) return;
    this.scheduled = true;
    setTimeout(() => {
      this.scheduled = false;
      void this.tick();
    }, Math.max(0, delayMs));
  }

  private async tick(): Promise<void> {
    try {
      const claim = await claimNextDelivery(this.client);
      if (claim.candidate) {
        await writeCampaignAudit(this.client, {
          campaignId: claim.candidate.campaignId,
          deliveryId: claim.candidate.id,
          action: 'delivery_claimed',
          details: { attempt: claim.candidate.attemptCount },
        });
        await sendClaimedDelivery(this.client, claim.candidate);
        this.schedule(0);
        return;
      }
      this.schedule(Math.min(Math.max(claim.waitMs, pollIntervalMs), 30_000));
    } catch (error) {
      console.error('Campaign queue tick failed', safeQueueError(error));
      this.schedule(5_000);
    }
  }
}

export function wakeCampaignQueueWorker(client: PrismaClient): void {
  startCampaignQueueWorker(client);
}

export async function getCampaignQueueSnapshot(client: PrismaClient) {
  const [pendingDeliveries, sendingDeliveries, activeCampaigns, failedDeliveries, nextRateLimit] = await Promise.all([
    client.emailCampaignDelivery.count({ where: { sendStatus: 'pending' } }),
    client.emailCampaignDelivery.count({ where: { sendStatus: 'sending' } }),
    client.emailCampaign.count({ where: { status: { in: ['queued', 'sending'] } } }),
    client.emailCampaignDelivery.findFirst({
      where: { sendStatus: 'failed' },
      orderBy: { updatedAt: 'desc' },
      select: { errorMessage: true, updatedAt: true },
    }),
    client.emailSendRateLimit.findFirst({ orderBy: { nextAllowedAt: 'asc' }, select: { nextAllowedAt: true } }),
  ]);
  return {
    worker: 'running',
    activeCampaigns,
    pendingDeliveries,
    sendingDeliveries,
    nextAllowedAt: nextRateLimit && nextRateLimit.nextAllowedAt.getTime() > Date.now()
      ? nextRateLimit.nextAllowedAt.toISOString()
      : null,
    lastError: failedDeliveries?.errorMessage ?? null,
    lastErrorAt: failedDeliveries?.updatedAt.toISOString() ?? null,
  };
}

function getQueueState(): { worker?: CampaignQueueWorker } {
  return globalThis as unknown as { worker?: CampaignQueueWorker };
}

export async function cancelCampaign(client: PrismaClient, campaignId: string) {
  const campaign = await client.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { deliveries: { orderBy: { createdAt: 'asc' } } },
  });
  if (!campaign) return null;
  if (campaign.status === 'sent' || campaign.status === 'partial_failed') return campaign;

  const cancelled = await client.emailCampaignDelivery.updateMany({
    where: { campaignId, sendStatus: 'pending' },
    data: { sendStatus: 'cancelled', errorMessage: 'Cancelled before send' },
  });
  await writeCampaignAudit(client, {
    campaignId,
    action: 'campaign_cancel_requested',
    details: { cancelledCount: cancelled.count },
  });
  await client.emailCampaign.update({
    where: { id: campaignId },
    data: { status: 'cancelled' },
  });
  return finalizeCampaign(client, campaignId);
}

async function claimNextDelivery(client: PrismaClient): Promise<ClaimResult> {
  const intervalMs = readSendIntervalMs();
  const now = new Date();

  return client.$transaction(async (tx) => {
    const candidates = await tx.$queryRaw<QueueCandidate[]>(Prisma.sql`
      SELECT
        d."id" AS "id",
        d."campaignId" AS "campaignId",
        c."senderEmail" AS "senderEmail",
        c."replyToEmail" AS "replyToEmail",
        d."toEmail" AS "toEmail",
        d."renderedSubject" AS "renderedSubject",
        d."renderedBodyHtml" AS "renderedBodyHtml",
        d."renderedBodyText" AS "renderedBodyText",
        c."simulationFailureRecipient" AS "simulationFailureRecipient"
        ,d."attemptCount" AS "attemptCount"
      FROM "email_campaign_deliveries" d
      INNER JOIN "email_campaigns" c ON c."id" = d."campaignId"
      WHERE d."sendStatus" = 'pending'
        AND c."status" IN ('queued', 'sending')
      ORDER BY d."createdAt" ASC, d."id" ASC
      FOR UPDATE OF d, c SKIP LOCKED
      LIMIT 1
    `);
    const candidate = candidates[0];
    if (!candidate) return { candidate: null, waitMs: pollIntervalMs };

    const rateKey = `smtp:${candidate.senderEmail.trim().toLowerCase()}`;
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "email_send_rate_limits" ("key", "nextAllowedAt", "updatedAt")
      VALUES (${rateKey}, ${now}, ${now})
      ON CONFLICT ("key") DO NOTHING
    `);
    const rateRows = await tx.$queryRaw<Array<{ nextAllowedAt: Date }>>(Prisma.sql`
      SELECT "nextAllowedAt"
      FROM "email_send_rate_limits"
      WHERE "key" = ${rateKey}
      FOR UPDATE
    `);
    const nextAllowedAt = rateRows[0]?.nextAllowedAt ?? now;
    if (nextAllowedAt.getTime() > now.getTime()) {
      return { candidate: null, waitMs: nextAllowedAt.getTime() - now.getTime() };
    }

    const nextSlot = new Date(now.getTime() + intervalMs);
    await tx.$executeRaw(Prisma.sql`
      UPDATE "email_send_rate_limits"
      SET "nextAllowedAt" = ${nextSlot}, "updatedAt" = ${now}
      WHERE "key" = ${rateKey}
    `);
    await tx.emailCampaignDelivery.update({
      where: { id: candidate.id },
      data: {
        sendStatus: 'sending',
        attemptCount: { increment: 1 },
        lastAttemptAt: now,
      },
    });
    await tx.emailCampaign.updateMany({
      where: { id: candidate.campaignId, status: 'queued' },
      data: { status: 'sending' },
    });
    return { candidate, waitMs: 0 };
  });
}

async function sendClaimedDelivery(client: PrismaClient, candidate: QueueCandidate): Promise<void> {
  const transport = createTransport(candidate.simulationFailureRecipient);
  try {
    const result = await transport.send({
      from: candidate.senderEmail,
      replyTo: candidate.replyToEmail,
      to: candidate.toEmail,
      subject: candidate.renderedSubject,
      html: candidate.renderedBodyHtml,
      text: candidate.renderedBodyText,
    });
    const accepted = result.accepted.some((value) => value.trim().toLowerCase() === candidate.toEmail) && result.rejected.length === 0;
    if (!accepted) {
      await client.emailCampaignDelivery.update({
        where: { id: candidate.id },
        data: { sendStatus: 'failed', errorMessage: 'SMTP rejected recipient' },
      });
      await writeCampaignAudit(client, { campaignId: candidate.campaignId, deliveryId: candidate.id, action: 'delivery_failed', details: { reason: 'SMTP rejected recipient' } });
    } else {
      await client.emailCampaignDelivery.update({
        where: { id: candidate.id },
        data: { sendStatus: 'sent', providerMessageId: result.messageId, sentAt: new Date() },
      });
      await writeCampaignAudit(client, { campaignId: candidate.campaignId, deliveryId: candidate.id, action: 'delivery_sent', details: { providerMessageId: result.messageId } });
    }
  } catch (error) {
    await client.emailCampaignDelivery.update({
      where: { id: candidate.id },
      data: { sendStatus: 'failed', errorMessage: safeSendError(error) },
    });
    await writeCampaignAudit(client, { campaignId: candidate.campaignId, deliveryId: candidate.id, action: 'delivery_failed', details: { reason: safeSendError(error) } });
  }
  await finalizeCampaign(client, candidate.campaignId);
}

function createTransport(simulationFailureRecipient: string | null): MailTransport {
  if (simulationFailureRecipient || isSimulatedMailTransportRequired()) {
    return createSimulatedMailTransport(simulationFailureRecipient ?? undefined);
  }
  return createTencentEnterpriseMailTransport();
}

export async function finalizeCampaign(client: PrismaClient, campaignId: string) {
  const campaign = await client.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { deliveries: true },
  });
  if (!campaign) return null;

  const successCount = campaign.deliveries.filter((delivery) => delivery.sendStatus === 'sent').length;
  const failedCount = campaign.deliveries.filter((delivery) => delivery.sendStatus === 'failed').length;
  const cancelledCount = campaign.deliveries.filter((delivery) => delivery.sendStatus === 'cancelled').length;
  const unfinishedCount = campaign.deliveries.filter((delivery) => delivery.sendStatus === 'pending' || delivery.sendStatus === 'sending').length;
  if (unfinishedCount > 0) {
    await client.emailCampaign.update({
      where: { id: campaignId },
      data: { successCount, failedCount, cancelledCount },
    });
    return campaign;
  }

  const status = campaign.status === 'cancelled' || cancelledCount > 0
    ? 'cancelled'
    : failedCount > 0
      ? 'partial_failed'
      : 'sent';
  const updated = await client.emailCampaign.update({
    where: { id: campaignId },
    data: {
      successCount,
      failedCount,
      cancelledCount,
      status,
      sentAt: campaign.sentAt ?? new Date(),
    },
    include: { deliveries: { orderBy: { createdAt: 'asc' } } },
  });
  await writeCampaignAudit(client, {
    campaignId,
    action: 'campaign_completed',
    details: { status, successCount, failedCount, cancelledCount },
  });
  await client.emailCampaignRetry.updateMany({
    where: { campaignId, status: { in: ['queued', 'sending'] } },
    data: { status: 'completed', completedAt: new Date() },
  });
  return updated;
}

async function recoverStaleDeliveries(client: PrismaClient): Promise<void> {
  const cutoff = new Date(Date.now() - staleDeliveryMs);
  const recovered = await client.emailCampaignDelivery.updateMany({
    where: {
      sendStatus: 'sending',
      OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: cutoff } }],
    },
    data: {
      sendStatus: 'failed',
      errorMessage: 'SMTP send interrupted; review before retrying',
    },
  });
  if (recovered.count > 0) {
    await writeCampaignAudit(client, { action: 'delivery_recovered', details: { recoveredCount: recovered.count } });
  }
}

async function finalizeAllCampaigns(client: PrismaClient): Promise<void> {
  const campaigns = await client.emailCampaign.findMany({
    where: { status: { in: ['queued', 'sending', 'cancelled'] } },
    select: { id: true },
  });
  for (const campaign of campaigns) await finalizeCampaign(client, campaign.id);
}

function readSendIntervalMs(): number {
  const raw = process.env.OUTREACH_SEND_INTERVAL_MS?.trim();
  if (!raw) return defaultSendIntervalMs;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 3_600_000) return defaultSendIntervalMs;
  return value;
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

function safeQueueError(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown queue error';
  return error.message.replace(/postgresql:\/\/[^\\s]+/gi, 'postgresql://[redacted]').slice(0, 240);
}
