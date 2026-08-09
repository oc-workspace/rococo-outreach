import { NextResponse } from 'next/server';
import { authorizeDevOutreachToken } from '@/lib/outreach/apiAuth';
import { toCampaignRecord } from '@/lib/outreach/campaigns';
import { CampaignSendError, isValidIdempotencyKey, sendAndPersistCampaign, type SendCampaignInput } from '@/lib/outreach/sendCampaign';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const accessFailure = authorizeDevOutreachToken(request);
  if (accessFailure) return accessFailure;

  const idempotencyKey = request.headers.get('idempotency-key')?.trim() ?? '';
  if (!isValidIdempotencyKey(idempotencyKey)) return privateJson({ error: 'A valid Idempotency-Key header is required' }, { status: 400 });

  const payload = await request.json().catch(() => null) as Partial<SendCampaignInput> | null;
  if (!payload) return privateJson({ error: 'Invalid request body' }, { status: 400 });

  try {
    const campaign = await sendAndPersistCampaign(payload as SendCampaignInput, idempotencyKey);
    return privateJson({ data: toCampaignRecord(campaign) });
  } catch (error) {
    if (error instanceof CampaignSendError) return privateJson({ error: error.message }, { status: error.status });
    return privateJson({ error: 'Campaign send failed' }, { status: 502 });
  }
}

function privateJson(body: unknown, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, private');
  return NextResponse.json(body, { ...init, headers });
}
