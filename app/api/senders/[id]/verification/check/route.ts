import { resolveTxt } from 'node:dns/promises';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { buildDnsTxtRecord, hasMatchingTxtRecord } from '@/lib/outreach/domainVerification';
import { isOutreachPrincipal, requireOutreachPermission } from '@/lib/outreach/permissions';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const access = await requireOutreachPermission(request, 'domain:verify');
  if (!isOutreachPrincipal(access)) return access;
  const sender = await prisma.emailSender.findFirst({ where: { id: params.id, workspaceKey: access.workspaceKey, teamKey: access.teamKey } });
  if (!sender) return privateJson({ error: 'Sender not found.' }, { status: 404 });
  const verification = await prisma.emailDomainVerification.findUnique({ where: { workspaceKey_teamKey_domain: { workspaceKey: access.workspaceKey, teamKey: access.teamKey, domain: sender.domain } } });
  if (!verification) return privateJson({ error: 'Verification has not been requested.' }, { status: 404 });

  const checkedAt = new Date();
  const record = buildDnsTxtRecord(verification.domain, verification.token);
  let records: string[][];
  try {
    records = await resolveTxt(record.name);
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 240) : 'DNS lookup failed.';
    await prisma.emailDomainVerification.update({ where: { id: verification.id }, data: { status: 'pending', lastCheckedAt: checkedAt, failureReason: reason } });
    return privateJson({ error: 'DNS TXT lookup failed.', data: { domain: verification.domain, status: 'pending', record, checkedAt } }, { status: 502 });
  }

  if (!hasMatchingTxtRecord(records, verification.token)) {
    await prisma.emailDomainVerification.update({ where: { id: verification.id }, data: { status: 'pending', lastCheckedAt: checkedAt, failureReason: 'Expected DNS TXT value was not found.' } });
    return privateJson({ error: 'Expected DNS TXT value was not found.', data: { domain: verification.domain, status: 'pending', record, checkedAt } }, { status: 422 });
  }

  const verifiedAt = new Date();
  await prisma.$transaction([
    prisma.emailDomainVerification.update({ where: { id: verification.id }, data: { status: 'verified', lastCheckedAt: checkedAt, verifiedAt, failureReason: null } }),
    prisma.emailSender.updateMany({ where: { workspaceKey: access.workspaceKey, teamKey: access.teamKey, domain: verification.domain }, data: { domainVerified: true } }),
  ]);
  return privateJson({ data: { domain: verification.domain, status: 'verified', record, checkedAt, verifiedAt } });
}

function privateJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, private');
  return NextResponse.json(body, { ...init, headers });
}
