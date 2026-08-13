export interface MailboxAccountLike {
  mailboxEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  status: string;
  verificationStatus: string;
}

export interface SmtpConnectionLike {
  user: string;
  host: string;
  port: number;
  secure: boolean;
}

export function isMailboxAccountReady(account: MailboxAccountLike | null | undefined): account is MailboxAccountLike {
  return Boolean(account && account.status === 'active' && account.verificationStatus === 'verified');
}

export function mailboxAccountMatchesSmtp(account: MailboxAccountLike, config: SmtpConnectionLike): boolean {
  return account.mailboxEmail.trim().toLowerCase() === config.user.trim().toLowerCase()
    && account.smtpHost.trim().toLowerCase() === config.host.trim().toLowerCase()
    && account.smtpPort === config.port
    && account.smtpSecure === config.secure;
}
