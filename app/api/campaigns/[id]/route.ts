import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { toCampaignRecord } from '@/lib/outreach/campaigns';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: params.id },
    include: { deliveries: { orderBy: { createdAt: 'asc' } } },
  });

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  return NextResponse.json({ data: toCampaignRecord(campaign) });
}
