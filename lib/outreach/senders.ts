import type { EmailSender } from './types';

export const allowedSenderStatuses = new Set(['active', 'inactive', 'disabled']);

export function toEmailSender(sender: {
  id: string;
  displayName: string;
  email: string;
  workspaceKey?: string;
  teamKey?: string;
  domain: string;
  domainVerified: boolean;
  senderVerified: boolean;
  status: string;
  mailboxAccountId?: string | null;
  mailboxAccount?: {
    mailboxEmail: string;
    status: string;
    verificationStatus: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}): EmailSender {
  return {
    id: sender.id,
    displayName: sender.displayName,
    email: sender.email,
    workspaceKey: sender.workspaceKey,
    teamKey: sender.teamKey,
    domain: sender.domain,
    domainVerified: sender.domainVerified,
    senderVerified: sender.senderVerified,
    status: allowedSenderStatuses.has(sender.status) ? sender.status as EmailSender['status'] : 'inactive',
    mailboxAccountId: sender.mailboxAccountId ?? null,
    mailboxAccount: sender.mailboxAccount ? {
      mailboxEmail: sender.mailboxAccount.mailboxEmail,
      status: sender.mailboxAccount.status,
      verificationStatus: sender.mailboxAccount.verificationStatus,
    } : null,
    createdAt: sender.createdAt.toISOString(),
    updatedAt: sender.updatedAt.toISOString(),
  };
}
