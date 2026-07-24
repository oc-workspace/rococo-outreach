import type { EmailSender } from './types';

export const allowedSenderStatuses = new Set(['active', 'inactive', 'disabled']);

export function toEmailSender(sender: {
  id: string;
  displayName: string;
  email: string;
  domain: string;
  domainVerified: boolean;
  senderVerified: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): EmailSender {
  return {
    ...sender,
    status: allowedSenderStatuses.has(sender.status) ? sender.status as EmailSender['status'] : 'inactive',
    createdAt: sender.createdAt.toISOString(),
    updatedAt: sender.updatedAt.toISOString(),
  };
}
