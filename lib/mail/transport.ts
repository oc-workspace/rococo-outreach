export interface MailMessage {
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailSendResult {
  messageId?: string;
  accepted: string[];
  rejected: string[];
  response?: string;
}

export interface MailTransport {
  send(message: MailMessage): Promise<MailSendResult>;
}
