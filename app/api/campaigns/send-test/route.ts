import { NextResponse } from 'next/server';
import { createTencentEnterpriseMailTransport, readTencentEnterpriseMailConfig } from '@/lib/mail/transportFactory';
import { authorizeDevOutreachToken } from '@/lib/outreach/apiAuth';

export const dynamic = 'force-dynamic';

type LimitedOperation = 'verify' | 'send';

const nextAllowedAt: Record<LimitedOperation, number> = {
  verify: 0,
  send: 0,
};

export async function GET(request: Request) {
  const accessFailure = await authorizeDevOutreachToken(request);
  if (accessFailure) return accessFailure;

  const readiness = readReadiness();
  return privateJson({
    data: {
      ready: readiness.ready,
      missing: readiness.missing,
      configurationValid: readiness.configurationValid,
      senderEmail: maskEmail(process.env.TENCENT_MAIL_SMTP_USER),
      testRecipientEmail: maskEmail(process.env.TEST_RECIPIENT_EMAIL),
      provider: 'tencent_enterprise_mail',
    },
  });
}

export async function PUT(request: Request) {
  const accessFailure = await authorizeDevOutreachToken(request);
  if (accessFailure) return accessFailure;

  const rateLimitFailure = reserveOperationSlot('verify');
  if (rateLimitFailure) return rateLimitFailure;

  try {
    const transport = createTencentEnterpriseMailTransport();
    await transport.verify();

    return privateJson({
      data: {
        provider: 'tencent_enterprise_mail',
        verified: true,
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return privateJson(
      {
        error: 'SMTP connection verification failed',
        failure: toSafeSmtpFailure(error),
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const accessFailure = await authorizeDevOutreachToken(request);
  if (accessFailure) return accessFailure;

  const rateLimitFailure = reserveOperationSlot('send');
  if (rateLimitFailure) return rateLimitFailure;

  try {
    const config = readTencentEnterpriseMailConfig();
    const subject = `Rococo Outreach SMTP Test ${new Date().toISOString()}`;
    const transport = createTencentEnterpriseMailTransport();
    const result = await transport.send({
      from: config.user,
      replyTo: config.user,
      to: config.testRecipientEmail,
      subject,
      html: [
        '<p>This is a Rococo Outreach SMTP test email.</p>',
        '<p>Please verify the recipient inbox and the sender mailbox Sent folder.</p>',
      ].join(''),
      text: 'This is a Rococo Outreach SMTP test email. Please verify the recipient inbox and the sender mailbox Sent folder.',
    });

    return privateJson({
      data: {
        provider: 'tencent_enterprise_mail',
        senderEmail: maskEmail(config.user),
        testRecipientEmail: maskEmail(config.testRecipientEmail),
        subject,
        messageId: result.messageId,
        acceptedCount: result.accepted.length,
        rejectedCount: result.rejected.length,
        sentFolderStatus: 'pending_manual_verification',
      },
    });
  } catch (error) {
    return privateJson(
      {
        error: 'SMTP test send failed',
        failure: toSafeSmtpFailure(error),
      },
      { status: 502 },
    );
  }
}

function readReadiness() {
  const required = [
    'TENCENT_MAIL_SMTP_USER',
    'TENCENT_MAIL_SMTP_PASSWORD',
    'TENCENT_MAIL_SMTP_HOST',
    'TENCENT_MAIL_SMTP_PORT',
    'TENCENT_MAIL_SMTP_SECURE',
    'TEST_RECIPIENT_EMAIL',
  ];
  const missing = required.filter((name) => !process.env[name]?.trim());
  let configurationValid = missing.length === 0;

  if (configurationValid) {
    try {
      readTencentEnterpriseMailConfig();
    } catch {
      configurationValid = false;
    }
  }

  return {
    ready: missing.length === 0 && configurationValid,
    missing,
    configurationValid,
  };
}

function reserveOperationSlot(operation: LimitedOperation): NextResponse | null {
  const now = Date.now();
  const retryAfterMs = nextAllowedAt[operation] - now;
  if (retryAfterMs > 0) {
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    return privateJson(
      { error: 'Too many SMTP test requests', retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
  }

  const defaultSeconds = operation === 'send' ? 60 : 10;
  const envName = operation === 'send' ? 'SMTP_TEST_SEND_INTERVAL_SECONDS' : 'SMTP_TEST_VERIFY_INTERVAL_SECONDS';
  nextAllowedAt[operation] = now + readPositiveIntegerEnv(envName, defaultSeconds) * 1000;
  return null;
}

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = process.env[name]?.trim();
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function maskEmail(value: string | undefined): string | null {
  if (!value) return null;

  const separator = value.lastIndexOf('@');
  if (separator <= 0 || separator === value.length - 1) return '***';

  const localPart = value.slice(0, separator);
  const domain = value.slice(separator + 1);
  const visibleLocal = localPart.length <= 2 ? localPart.slice(0, 1) : localPart.slice(0, 2);
  return `${visibleLocal}***@${domain}`;
}

function toSafeSmtpFailure(error: unknown): { code: string | null; command: string | null } {
  if (!error || typeof error !== 'object') return { code: null, command: null };

  const value = error as { code?: unknown; command?: unknown };
  return {
    code: safeIdentifier(value.code),
    command: safeIdentifier(value.command),
  };
}

function safeIdentifier(value: unknown): string | null {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(value)) return null;
  return value;
}

function privateJson(body: unknown, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, private');
  return NextResponse.json(body, { ...init, headers });
}
