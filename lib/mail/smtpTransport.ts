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
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
      connectionTimeout: config.connectionTimeoutMs ?? 10000,
      greetingTimeout: config.greetingTimeoutMs ?? 10000,
      socketTimeout: config.socketTimeoutMs ?? 15000,
    });
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

function normalizeAddressList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}
