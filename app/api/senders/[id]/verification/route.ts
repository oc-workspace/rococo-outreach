import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { buildDnsTxtRecord } from '@/lib/outreach/domainVerification';
import { isOutreachPrincipal, requireOutreachPermission } from '@/lib/outreach/permissions';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const access = await requireOutreachPermission(request, 'domain:verify');
  if (!isOutreachPrincipal(access)) return access;
  const sender = await prisma.emailSender.findFirst({ where: { id: params.id, workspaceKey: access.workspaceKey, teamKey: access.teamKey } });
  if (!sender) return privateJson({ error: 'Sender not found.' }, { status: 404 });
  if (!sender.domain) return privateJson({ error: 'Sender has no valid domain.' }, { status: 400 });

  const token = `rococo-outreach-${randomUUID()}`;
  const requestedAt = new Date();
  const verification = await prisma.emailDomainVerification.upsert({
    where: { workspaceKey_teamKey_domain: { workspaceKey: access.workspaceKey, teamKey: access.teamKey, domain: sender.domain } },
    update: { method: 'dns_txt', status: 'pending', token, requestedAt, lastCheckedAt: null, verifiedAt: null, failureReason: null },
    create: { workspaceKey: access.workspaceKey, teamKey: access.teamKey, domain: sender.domain, method: 'dns_txt', status: 'pending', token, requestedAt },
  });
  await prisma.emailSender.updateMany({ where: { workspaceKey: access.workspaceKey, teamKey: access.teamKey, domain: sender.domain }, data: { domainVerified: false } });

  return privateJson({ data: { domain: verification.domain, status: verification.status, method: verification.method, requestedAt: verification.requestedAt, record: buildDnsTxtRecord(verification.domain, verification.token) } }, { status: 201 });
}

function privateJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, private');
  return NextResponse.json(body, { ...init, headers });
}
