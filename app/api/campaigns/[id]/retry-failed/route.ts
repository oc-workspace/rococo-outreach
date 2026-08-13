import { NextResponse } from 'next/server';
import { isSimulatedMailTransportRequired, readSimulationFailureRecipient, SimulationInputError } from '@/lib/mail/simulatedTransport';
import { authorizeDevOutreachToken } from '@/lib/outreach/apiAuth';
import { toCampaignRecord } from '@/lib/outreach/campaigns';
import { isValidIdempotencyKey, retryFailedCampaign } from '@/lib/outreach/sendCampaign';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const accessFailure = await authorizeDevOutreachToken(request);
  if (accessFailure) return accessFailure;

  const idempotencyKey = request.headers.get('idempotency-key')?.trim() ?? '';
  if (!isValidIdempotencyKey(idempotencyKey)) return privateJson({ error: 'A valid Idempotency-Key header is required' }, { status: 400 });

  try {
    const simulationFailureRecipient = readSimulationFailureRecipient(request);
    const campaign = await retryFailedCampaign(
      params.id,
      idempotencyKey,
      simulationFailureRecipient || isSimulatedMailTransportRequired()
        ? { simulationFailureRecipient }
        : undefined,
    );
    return privateJson({ data: toCampaignRecord(campaign) });
  } catch (error) {
    if (error instanceof SimulationInputError) return privateJson({ error: error.message }, { status: error.status });
    return privateJson({ error: error instanceof Error ? error.message : 'Campaign retry failed' }, { status: error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : 502 });
  }
}

function privateJson(body: unknown, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, private');
  return NextResponse.json(body, { ...init, headers });
}
