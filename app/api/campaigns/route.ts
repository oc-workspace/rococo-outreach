import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { toCampaignRecord } from '@/lib/outreach/campaigns';

export const dynamic = 'force-dynamic';

export async function GET() {
  const campaigns = await prisma.emailCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: { deliveries: { orderBy: { createdAt: 'asc' } } },
  });

  return NextResponse.json({ data: campaigns.map(toCampaignRecord) });
}
