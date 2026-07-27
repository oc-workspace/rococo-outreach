import { SmtpMailTransport, type SmtpTransportConfig } from './smtpTransport';
import type { MailTransport } from './transport';

export interface TencentEnterpriseMailConfig extends SmtpTransportConfig {
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  testRecipientEmail: string;
}

export function createTencentEnterpriseMailTransport(): MailTransport {
  return new SmtpMailTransport(readTencentEnterpriseMailConfig());
}

export function readTencentEnterpriseMailConfig(): TencentEnterpriseMailConfig {
  const config = {
    user: requiredEnv('TENCENT_MAIL_SMTP_USER'),
    password: requiredEnv('TENCENT_MAIL_SMTP_PASSWORD'),
    host: requiredEnv('TENCENT_MAIL_SMTP_HOST'),
    port: requiredNumberEnv('TENCENT_MAIL_SMTP_PORT'),
    secure: requiredBooleanEnv('TENCENT_MAIL_SMTP_SECURE'),
    imapHost: requiredEnv('TENCENT_MAIL_IMAP_HOST'),
    imapPort: requiredNumberEnv('TENCENT_MAIL_IMAP_PORT'),
    imapSecure: requiredBooleanEnv('TENCENT_MAIL_IMAP_SECURE'),
    testRecipientEmail: requiredEnv('TEST_RECIPIENT_EMAIL'),
  };

  return config;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function requiredNumberEnv(name: string): number {
  const value = requiredEnv(name);
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`Invalid numeric environment variable: ${name}`);
  return parsed;
}

function requiredBooleanEnv(name: string): boolean {
  const value = requiredEnv(name).toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`Invalid boolean environment variable: ${name}`);
}
