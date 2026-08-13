import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { authorizeDevOutreachToken } from '@/lib/outreach/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const accessFailure = await authorizeDevOutreachToken(request);
  if (accessFailure) return accessFailure;
  const logs = await prisma.emailCampaignAuditLog.findMany({
    where: { campaignId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ data: logs }, { headers: { 'Cache-Control': 'no-store, private' } });
}
