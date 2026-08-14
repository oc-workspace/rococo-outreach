import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { toEmailSender } from '@/lib/outreach/senders';
import { isMailboxAccountReady } from '@/lib/outreach/mailboxAccounts';
import { isAllowedSenderEmail } from '@/lib/outreach/senderPolicy';
import { authorizeDevOutreachToken } from '@/lib/outreach/apiAuth';
import { getEmailDomain } from '@/lib/outreach/senderPolicy';
import { getOutreachTeamKey, getOutreachWorkspaceKey } from '@/lib/outreach/workspaceScope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const accessFailure = await authorizeDevOutreachToken(request);
  if (accessFailure) return accessFailure;

  const management = new URL(request.url).searchParams.get('management') === 'true';
  const senders = await prisma.emailSender.findMany({
    where: { workspaceKey: getOutreachWorkspaceKey(), teamKey: getOutreachTeamKey() },
    orderBy: [{ status: 'asc' }, { email: 'asc' }],
    include: { mailboxAccount: true },
  });

  const allowedSenders = senders.filter((sender) => isAllowedSenderEmail(sender.email));
  const visibleSenders = management
    ? allowedSenders
    : allowedSenders.filter((sender) => sender.status === 'active' && sender.domainVerified && sender.senderVerified && isMailboxAccountReady(sender.mailboxAccount));

  return privateJson({ data: visibleSenders.map(toEmailSender) });
}

export async function POST(request: Request) {
  const accessFailure = await authorizeDevOutreachToken(request);
  if (accessFailure) return accessFailure;

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

  const workspaceKey = getOutreachWorkspaceKey();
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
        teamKey: getOutreachTeamKey(),
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
