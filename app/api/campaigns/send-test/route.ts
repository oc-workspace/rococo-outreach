import { NextResponse } from 'next/server';
import { createTencentEnterpriseMailTransport, readTencentEnterpriseMailConfig } from '@/lib/mail/transportFactory';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isDevOutreachEnvironment()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const readiness = readReadiness();
  return NextResponse.json({
    data: {
      ready: readiness.ready,
      missing: readiness.missing,
      senderEmail: process.env.TENCENT_MAIL_SMTP_USER ?? null,
      testRecipientEmail: process.env.TEST_RECIPIENT_EMAIL ?? null,
      provider: 'tencent_enterprise_mail',
    },
  });
}

export async function POST() {
  if (!isDevOutreachEnvironment()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

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

    return NextResponse.json({
      data: {
        provider: 'tencent_enterprise_mail',
        senderEmail: config.user,
        testRecipientEmail: config.testRecipientEmail,
        subject,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
        response: result.response,
        sentFolderStatus: 'pending_manual_verification',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'SMTP test send failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

function isDevOutreachEnvironment(): boolean {
  return process.env.NEXT_PUBLIC_OUTREACH_ENV === 'dev';
}

function readReadiness() {
  const required = [
    'TENCENT_MAIL_SMTP_USER',
    'TENCENT_MAIL_SMTP_PASSWORD',
    'TENCENT_MAIL_SMTP_HOST',
    'TENCENT_MAIL_SMTP_PORT',
    'TENCENT_MAIL_SMTP_SECURE',
    'TENCENT_MAIL_IMAP_HOST',
    'TENCENT_MAIL_IMAP_PORT',
    'TENCENT_MAIL_IMAP_SECURE',
    'TEST_RECIPIENT_EMAIL',
  ];
  const missing = required.filter((name) => !process.env[name]?.trim());

  return { ready: missing.length === 0, missing };
}
