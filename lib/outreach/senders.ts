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
  domainVerification?: {
    domain: string;
    status: string;
    method: string;
    lastCheckedAt: Date | null;
    verifiedAt: Date | null;
    failureReason: string | null;
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
    domainVerification: sender.domainVerification ? {
      domain: sender.domainVerification.domain,
      status: sender.domainVerification.status,
      method: sender.domainVerification.method,
      lastCheckedAt: sender.domainVerification.lastCheckedAt?.toISOString() ?? null,
      verifiedAt: sender.domainVerification.verifiedAt?.toISOString() ?? null,
      failureReason: sender.domainVerification.failureReason,
    } : null,
    createdAt: sender.createdAt.toISOString(),
    updatedAt: sender.updatedAt.toISOString(),
  };
}
