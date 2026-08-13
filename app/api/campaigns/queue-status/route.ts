import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { authorizeDevOutreachToken } from '@/lib/outreach/apiAuth';
import { getCampaignQueueSnapshot } from '@/lib/outreach/queueWorker';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const accessFailure = await authorizeDevOutreachToken(request);
  if (accessFailure) return accessFailure;
  return NextResponse.json({ data: await getCampaignQueueSnapshot(prisma) }, { headers: { 'Cache-Control': 'no-store, private' } });
}
