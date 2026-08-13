import { NextResponse } from 'next/server';
import { authorizeDevOutreachToken } from '@/lib/outreach/apiAuth';
import { toCampaignRecord } from '@/lib/outreach/campaigns';
import { cancelCampaign } from '@/lib/outreach/queueWorker';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const accessFailure = await authorizeDevOutreachToken(request);
  if (accessFailure) return accessFailure;

  const campaign = await cancelCampaign(prisma, params.id);
  if (!campaign) return privateJson({ error: 'Campaign not found' }, { status: 404 });
  return privateJson({ data: toCampaignRecord(campaign) });
}

function privateJson(body: unknown, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, private');
  return NextResponse.json(body, { ...init, headers });
}
