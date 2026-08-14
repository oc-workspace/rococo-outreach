import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { isMailboxAccountReady } from '@/lib/outreach/mailboxAccounts';
import { toEmailSender } from '@/lib/outreach/senders';
import { isOutreachPrincipal, requireOutreachPermission, type OutreachPrincipal } from '@/lib/outreach/permissions';

export const dynamic = 'force-dynamic';

const editableStatuses = new Set(['active', 'inactive', 'disabled']);

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const access = await requireOutreachPermission(request, 'sender:write');
  if (!isOutreachPrincipal(access)) return access;

  const sender = await findSender(params.id, access);
  if (!sender) return privateJson({ error: 'Sender not found.' }, { status: 404 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const data: { displayName?: string; status?: string } = {};

  if (typeof body?.displayName !== 'undefined') {
    if (typeof body.displayName !== 'string' || body.displayName.trim().length > 120) {
      return privateJson({ error: 'Display name must be at most 120 characters.' }, { status: 400 });
    }
    data.displayName = body.displayName.trim();
  }
  if (typeof body?.status !== 'undefined') {
    if (typeof body.status !== 'string' || !editableStatuses.has(body.status)) {
      return privateJson({ error: 'Unsupported sender status.' }, { status: 400 });
    }
    if (body.status === 'active' && !isSenderReady(sender)) {
      return privateJson({ error: 'Sender must have domain, sender, and mailbox verification before activation.' }, { status: 409 });
    }
    data.status = body.status;
  }
  if (Object.keys(data).length === 0) return privateJson({ error: 'No editable sender fields were provided.' }, { status: 400 });

  const updated = await prisma.emailSender.update({
    where: { id: sender.id },
    data,
    include: { mailboxAccount: true },
  });
  return privateJson({ data: toEmailSender(updated) });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const access = await requireOutreachPermission(request, 'sender:write');
  if (!isOutreachPrincipal(access)) return access;

  const sender = await findSender(params.id, access);
  if (!sender) return privateJson({ error: 'Sender not found.' }, { status: 404 });
  const updated = await prisma.emailSender.update({
    where: { id: sender.id },
    data: { status: 'disabled' },
    include: { mailboxAccount: true },
  });
  return privateJson({ data: toEmailSender(updated) });
}

async function findSender(id: string, principal: OutreachPrincipal) {
  return prisma.emailSender.findFirst({
    where: { id, workspaceKey: principal.workspaceKey, teamKey: principal.teamKey },
    include: { mailboxAccount: true },
  });
}

function isSenderReady(sender: Awaited<ReturnType<typeof findSender>>): boolean {
  return Boolean(
    sender
    && sender.domainVerified
    && sender.senderVerified
    && isMailboxAccountReady(sender.mailboxAccount)
    && sender.mailboxAccount.mailboxEmail.trim().toLowerCase() === sender.email.trim().toLowerCase(),
  );
}

function privateJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, private');
  return NextResponse.json(body, { ...init, headers });
}
