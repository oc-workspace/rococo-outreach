import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { campaignDraftContent, toCampaignDraftRecord } from '@/lib/outreach/campaignDrafts';

export const dynamic = 'force-dynamic';

export async function GET() {
  const draft = await prisma.emailCampaignDraft.findUnique({ where: { workspaceKey: 'default' } });
  return privateJson({ data: draft ? toCampaignDraftRecord(draft) : null });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = campaignDraftContent(body);
  if (parsed.errors.length > 0) return privateJson({ error: parsed.errors[0], errors: parsed.errors }, { status: 400 });
  const data = parsed.data!;
  const draft = await prisma.emailCampaignDraft.upsert({
    where: { workspaceKey: 'default' },
    create: { workspaceKey: 'default', ...data, recipientRows: data.recipientRows as unknown as object },
    update: { ...data, recipientRows: data.recipientRows as unknown as object },
  });
  return privateJson({ data: toCampaignDraftRecord(draft) });
}

export async function DELETE() {
  await prisma.emailCampaignDraft.deleteMany({ where: { workspaceKey: 'default' } });
  return privateJson({ data: { deleted: true } });
}

function privateJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, private');
  return NextResponse.json(body, { ...init, headers });
}
