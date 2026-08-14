import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { toEmailSender } from '@/lib/outreach/senders';
import { isMailboxAccountReady } from '@/lib/outreach/mailboxAccounts';
import { isAllowedSenderEmail } from '@/lib/outreach/senderPolicy';
import { getEmailDomain } from '@/lib/outreach/senderPolicy';
import { isOutreachPrincipal, requireOutreachPermission } from '@/lib/outreach/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await requireOutreachPermission(request, 'sender:read');
  if (!isOutreachPrincipal(access)) return access;

  const management = new URL(request.url).searchParams.get('management') === 'true';
  const senders = await prisma.emailSender.findMany({
    where: { workspaceKey: access.workspaceKey, teamKey: access.teamKey },
    orderBy: [{ status: 'asc' }, { email: 'asc' }],
    include: { mailboxAccount: true },
  });
  const domainVerifications = await prisma.emailDomainVerification.findMany({ where: { workspaceKey: access.workspaceKey, teamKey: access.teamKey } });
  const domainVerificationByDomain = new Map(domainVerifications.map((verification) => [verification.domain, verification]));

  const allowedSenders = senders.filter((sender) => isAllowedSenderEmail(sender.email));
  const visibleSenders = management
    ? allowedSenders
    : allowedSenders.filter((sender) => sender.status === 'active' && sender.domainVerified && sender.senderVerified && isMailboxAccountReady(sender.mailboxAccount));

  return privateJson({
    data: visibleSenders.map((sender) => toEmailSender({ ...sender, domainVerification: domainVerificationByDomain.get(sender.domain) ?? null })),
    meta: { workspaceKey: access.workspaceKey, teamKey: access.teamKey, role: access.role },
  });
}

export async function POST(request: Request) {
  const access = await requireOutreachPermission(request, 'sender:write');
  if (!isOutreachPrincipal(access)) return access;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
  const domain = getEmailDomain(email);
  if (!email || !domain || !isAllowedSenderEmail(email)) {
    return privateJson({ error: 'Sender email must use the configured internal domain.' }, { status: 400 });
  }
  if (displayName.length > 120) return privateJson({ error: 'Display name is too long.' }, { status: 400 });
  if (typeof body?.mailboxAccountId !== 'undefined' && typeof body.mailboxAccountId !== 'string') {
    return privateJson({ error: 'mailboxAccountId must be a string when provided.' }, { status: 400 });
  }

  const workspaceKey = access.workspaceKey;
  const mailboxAccountId = typeof body?.mailboxAccountId === 'string' ? body.mailboxAccountId.trim() : '';
  let mailboxAccount = null;
  if (mailboxAccountId) {
    mailboxAccount = await prisma.emailMailboxAccount.findFirst({ where: { id: mailboxAccountId, workspaceKey } });
    if (!mailboxAccount) return privateJson({ error: 'Mailbox account is outside the current workspace.' }, { status: 400 });
    if (mailboxAccount.mailboxEmail.trim().toLowerCase() !== email) {
      return privateJson({ error: 'Sender email must exactly match its mailbox account email.' }, { status: 400 });
    }
  }

  try {
    const sender = await prisma.emailSender.create({
      data: {
        displayName,
        email,
        workspaceKey,
        teamKey: access.teamKey,
        domain,
        domainVerified: false,
        senderVerified: false,
        status: 'inactive',
        mailboxAccountId: mailboxAccount?.id ?? null,
      },
      include: { mailboxAccount: true },
    });
    return privateJson({ data: toEmailSender(sender) }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) return privateJson({ error: 'A sender with this email already exists.' }, { status: 409 });
    throw error;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

function privateJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, private');
  return NextResponse.json(body, { ...init, headers });
}
