import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { toEmailSender } from '@/lib/outreach/senders';
import { isMailboxAccountReady } from '@/lib/outreach/mailboxAccounts';
import { isAllowedSenderEmail } from '@/lib/outreach/senderPolicy';

export const dynamic = 'force-dynamic';

export async function GET() {
  const senders = await prisma.emailSender.findMany({
    orderBy: [{ status: 'asc' }, { email: 'asc' }],
    include: { mailboxAccount: true },
  });

  return NextResponse.json({ data: senders.filter((sender) => isAllowedSenderEmail(sender.email) && isMailboxAccountReady(sender.mailboxAccount)).map(toEmailSender) });
}
