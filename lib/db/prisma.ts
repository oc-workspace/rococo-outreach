import { PrismaClient } from '@prisma/client';
import { startCampaignQueueWorker } from '@/lib/outreach/queueWorker';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; campaignQueueWorkerStarted?: boolean };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

if (process.env.NEXT_PHASE !== 'phase-production-build' && !globalForPrisma.campaignQueueWorkerStarted) {
  globalForPrisma.campaignQueueWorkerStarted = true;
  startCampaignQueueWorker(prisma);
}
