import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type { MailMessage, MailSendResult, MailTransport } from './transport';

export interface SmtpTransportConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  connectionTimeoutMs?: number;
  greetingTimeoutMs?: number;
  socketTimeoutMs?: number;
}

export class SmtpMailTransport implements MailTransport {
  private readonly transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

  constructor(config: SmtpTransportConfig) {
    validateSmtpTransportConfig(config);

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: !config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
      tls: {
        minVersion: 'TLSv1.2',
        servername: config.host,
      },
      connectionTimeout: config.connectionTimeoutMs ?? 10000,
      greetingTimeout: config.greetingTimeoutMs ?? 10000,
      socketTimeout: config.socketTimeoutMs ?? 15000,
    });
  }

  async verify(): Promise<void> {
    await this.transporter.verify();
  }

  async send(message: MailMessage): Promise<MailSendResult> {
    const result = await this.transporter.sendMail({
      from: message.from,
      replyTo: message.replyTo,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    return {
      messageId: result.messageId,
      accepted: normalizeAddressList(result.accepted),
      rejected: normalizeAddressList(result.rejected),
      response: result.response,
    };
  }
}

export function validateSmtpTransportConfig(config: SmtpTransportConfig): void {
  if (!config.host.trim()) throw new Error('SMTP host is required');
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error('SMTP port must be an integer between 1 and 65535');
  }
  if (!config.user.trim()) throw new Error('SMTP username is required');
  if (!config.password) throw new Error('SMTP password is required');
  if (config.port === 465 && !config.secure) {
    throw new Error('SMTP port 465 requires secure=true');
  }
  if (config.port === 587 && config.secure) {
    throw new Error('SMTP port 587 requires secure=false with STARTTLS');
  }
}

function normalizeAddressList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}
