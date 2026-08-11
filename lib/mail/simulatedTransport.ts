import type { MailMessage, MailSendResult, MailTransport } from './transport';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const simulationHeader = 'x-outreach-simulate-failure-recipient';

export class SimulationInputError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'SimulationInputError';
  }
}

export function readSimulationFailureRecipient(request: Request): string | undefined {
  const rawValue = request.headers.get(simulationHeader);
  if (rawValue === null || rawValue.trim() === '') return undefined;

  const normalized = rawValue.trim().toLowerCase();
  if (!emailPattern.test(normalized)) {
    throw new SimulationInputError(`The ${simulationHeader} header must contain a valid email address`);
  }
  return normalized;
}

export function createSimulatedMailTransport(failureRecipient?: string): MailTransport {
  let sequence = 0;

  return {
    async verify() {
      return undefined;
    },
    async send(message: MailMessage): Promise<MailSendResult> {
      sequence += 1;
      const recipient = message.to.trim().toLowerCase();
      if (failureRecipient && recipient === failureRecipient) {
        return {
          accepted: [],
          rejected: [recipient],
          response: 'simulated recipient rejection',
        };
      }

      return {
        accepted: [recipient],
        rejected: [],
        messageId: `<simulated-${sequence}@rococo-outreach.dev>`,
        response: 'simulated recipient acceptance',
      };
    },
  };
}

export function isSimulatedMailTransportRequired(): boolean {
  return process.env.OUTREACH_MAIL_TRANSPORT === 'simulated';
}
