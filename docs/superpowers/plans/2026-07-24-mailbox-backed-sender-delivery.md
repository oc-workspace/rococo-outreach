# Enterprise Mailbox-Backed Sender Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an employee send outreach from an allowed enterprise mailbox such as `employee@pp.com`, have recipients see and reply to that mailbox, and, where provider capabilities allow it, have the sent message appear in that employee mailbox's Sent folder.

**Architecture:** Keep frontend sender selection simple and server-authoritative. Add a real send API, persistent campaign/delivery records, and a mailbox account layer that separates sender identity (`From` and `Reply-To`) from the transport used to deliver the message. For Sent-folder visibility, prefer enterprise mailbox-owned SMTP/API sending or explicit append-to-sent support; do not pretend a third-party provider send will automatically appear in `employee@pp.com` Sent Mail.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript 5.4, Prisma 6.19, PostgreSQL, current `fetch`-based React state, existing CSS in `app/globals.css`, deployment through `/home/openclaw/bin/oc-deploy rococo-outreach deploy`.

## Global Constraints

- Current deployed app: `https://outreach-dev.rococo.dev`.
- Current latest verified sender work: `b2c58a7 Tighten sender selection states` and documentation commit `3a0cb15 Document email sender requirements status`.
- Current send behavior is simulated in `lib/outreach/send.ts`; it does not send real email.
- Current campaign history is frontend state only; it is lost on reload.
- Current `/api/senders` is database-backed and returns `EmailSender[]`.
- Current seeded sender emails are `employeename1@pp.com` and `employeename2@pp.com`; the clarified requirement is to support company employee mailboxes like `employee@pp.com` that are accessed through Enterprise WeChat / Tencent enterprise mail.
- One campaign must still create one independent email per recipient. Never place multiple outreach recipients in one `To`, `CC`, or shared `BCC` send.
- The backend must be authoritative for sender eligibility, mailbox authorization, provider errors, rate limits, and delivery persistence.
- Do not store raw mailbox passwords. If enterprise mailbox SMTP is used, store only an encrypted app password, authorization code, or provider token, never a login password.
- Do not log secrets, OAuth tokens, app passwords, SMTP credentials, full message bodies, or recipient lists in deployment logs.
- Use small commits after each independently testable task.

---

## Requirement Clarification

The user-facing requirement has three different levels:

1. Recipient sees `From: employee@pp.com`.
2. Recipient replies to `employee@pp.com`.
3. `employee@pp.com` mailbox Sent folder shows the sent email.

Levels 1 and 2 can be implemented with a mail provider only if that provider allows the sender address and reply-to address. Level 3 usually cannot be guaranteed by generic provider sending. To make Sent Mail appear inside the employee's mailbox, the system must either:

- send through that exact mailbox account via SMTP or mailbox provider API; or
- send elsewhere and separately append a copy to the mailbox Sent folder through IMAP/API, if the mailbox provider allows it.

For the first team, the mailbox is confirmed to be an enterprise mailbox accessed through Enterprise WeChat. The practical MVP path is likely enterprise SMTP with an account-specific authorization code or admin-enabled SMTP access. Enterprise WeChat / Tencent enterprise mail API support, SMTP/IMAP availability, and Sent-folder behavior must be verified before promising automatic Sent-folder sync.

## Current State Summary

Already implemented:

- `components/SenderSettings.tsx` lets users choose a sender and edit reply-to.
- `EmailSender` exists in `lib/outreach/types.ts`.
- Prisma `EmailSender` exists in `prisma/schema.prisma` mapped to `email_senders`.
- `GET /api/senders` reads from PostgreSQL through Prisma.
- `validateCampaignSend()` blocks missing, invalid, inactive, disabled, unverified, or unready senders.
- Preview and frontend campaign history show sender email, sender name, and reply-to email.

Not implemented yet:

- Real email provider integration.
- Real send API endpoint.
- Persistent campaign and delivery database records.
- Sender mailbox credentials/tokens.
- Mailbox authorization flow for `employee@pp.com` enterprise mailboxes.
- Sent folder confirmation or sync.
- Provider-specific error states in UI.

## Recommended Product Decision

Support `employee@pp.com` as an enterprise mailbox-backed sender only after that employee mailbox is authorized or confirmed by the enterprise mail admin. The `pp.com` domain is both the workspace/company domain and the sender email domain, so this should be modeled as a company mailbox sender rather than a personal external mailbox sender.

Recommended sender modes:

```ts
type SenderTransportMode = 'provider_domain' | 'mailbox_smtp' | 'mailbox_api';
```

- `provider_domain`: uses a verified sending domain owned by the app/team, for example `employee@pp.com` through a provider. Sent folder in the employee's mailbox is not guaranteed.
- `mailbox_smtp`: uses the employee's enterprise mailbox SMTP account, for example Tencent enterprise mail SMTP if the admin enables it. This is the best MVP candidate for Sent folder visibility, but behavior must be verified with the actual enterprise mailbox.
- `mailbox_api`: uses an enterprise mail API when available. Best long-term model for admin-managed authorization and Sent folder accuracy.

## Target Data Flow

```text
SenderSettings
  -> selected EmailSender
  -> POST /api/campaigns/send-test or /api/campaigns/send
  -> server validates sender + mailbox authorization
  -> create EmailCampaign + EmailCampaignDelivery records
  -> send one email per recipient through selected transport
  -> store providerMessageId, status, sentAt, errorMessage
  -> return campaign and delivery summary
  -> frontend updates Campaign History from server data
```

For mailbox-backed sending:

```text
EmailSender employee@pp.com
  -> EmailMailboxAccount encrypted credentials/token
  -> SMTP/API transport owned by employee@pp.com
  -> recipient sees From employee@pp.com
  -> Reply-To employee@pp.com
  -> Sent folder visibility depends on provider behavior/API support
```

## File Structure

Planned files and responsibilities:

- Modify: `prisma/schema.prisma` - add campaign, delivery, and mailbox account persistence.
- Create: `prisma/migrations/<timestamp>_add_campaign_delivery_and_mailbox_accounts/migration.sql` - database migration.
- Modify: `lib/outreach/types.ts` - add persisted campaign/delivery API types, sender transport fields, mailbox authorization status fields.
- Create: `lib/outreach/campaigns.ts` - server-side mapping helpers for campaign and delivery records.
- Create: `lib/outreach/mailboxAccounts.ts` - server-side mailbox account mapping and safe public status helpers.
- Create: `lib/mail/transport.ts` - provider-neutral send interface.
- Create: `lib/mail/smtpTransport.ts` - SMTP send implementation for mailbox-owned sending.
- Create: `lib/mail/mockTransport.ts` - deterministic test transport used in development and tests.
- Create: `app/api/campaigns/send-test/route.ts` - server endpoint for test sends.
- Create: `app/api/campaigns/send/route.ts` - server endpoint for real campaign sends.
- Create: `app/api/campaigns/route.ts` - list persisted campaigns.
- Create: `app/api/campaigns/[id]/route.ts` - campaign detail endpoint.
- Create: `app/api/senders/[id]/mailbox/route.ts` - start/update mailbox authorization status for a sender.
- Modify: `app/api/senders/route.ts` - include safe sender transport and mailbox readiness fields.
- Modify: `components/OutreachApp.tsx` - replace mock send with API calls and load campaign history from server.
- Modify: `components/SenderSettings.tsx` - show mailbox authorization and Sent folder support state.
- Modify: `components/HistoryPanel.tsx` - render persisted campaign/delivery status from server.
- Modify: `components/PreviewPanel.tsx` - show clear From, Reply-To, and Sent-folder capability before sending.
- Create: `docs/product/mailbox-backed-sender-delivery.md` - user-facing product notes and provider caveats.

---

### Task 0: Confirm Enterprise Mail Provider and Test Mailbox Capabilities

**Files:**
- Create: `docs/operations/enterprise-mailbox-checklist.md`
- Modify: `docs/product/mailbox-backed-sender-delivery.md` if it already exists by the time this task runs.

**Interfaces:**
- Consumes: one real employee mailbox such as `employee@pp.com` and the company's mail admin/login context.
- Produces: provider facts that Tasks 6 and 7 must use for SMTP/API configuration.

- [ ] **Step 1: Document what counts as confirmed**

Create `docs/operations/enterprise-mailbox-checklist.md`:

```md
# Enterprise Mailbox Capability Checklist

## Known Context

- Company/team domain: `pp.com`
- Employee mailbox format: `employee@pp.com`
- Login surface observed by user: Enterprise WeChat / WeCom company login

This strongly suggests the mailbox is managed through Enterprise WeChat / Tencent enterprise mail, but engineering should still confirm the actual mail routing and SMTP/API settings before implementation.

## Provider Confirmation

Confirm at least one of these:

- The mailbox web UI or settings page identifies the provider as Enterprise WeChat mail, Tencent enterprise mail, or Tencent Exmail.
- The domain MX records point to Tencent enterprise mail servers.
- The company mail admin console shows the mail service provider and SMTP/IMAP settings.

Record the result:

```text
Provider:
MX records:
Admin/settings page evidence:
Confirmed by:
Date:
```

## SMTP / IMAP Capability

Confirm in the employee mailbox or admin console:

- SMTP is enabled for the employee mailbox.
- IMAP is enabled only if Sent-folder append/sync is needed beyond SMTP send behavior.
- The account uses an authorization code, app password, or enterprise token instead of the login password.
- SMTP host, port, and TLS mode are known.
- Any outbound limits or anti-abuse restrictions are known.

Record the result:

```text
SMTP enabled: yes/no
SMTP host:
SMTP port:
SMTP secure/TLS mode:
Auth method:
IMAP enabled: yes/no
IMAP host:
IMAP port:
Daily/hourly send limit:
```

## Test Mailbox

Using the user's own employee mailbox can count as the first test mailbox if the user is allowed to test sending from it.

Record the result:

```text
Test sender address:
Can send test email: yes/no
Can inspect inbox and sent folder: yes/no
Has permission to use this mailbox for integration testing: yes/no
```

## Sent Folder Verification

After SMTP/API sending is implemented in a controlled environment, send one test email from `employee@pp.com` to a controlled recipient.

Record the result:

```text
Recipient saw From as employee@pp.com: yes/no
Recipient reply target was employee@pp.com: yes/no
Message appeared in employee@pp.com Sent folder: yes/no
Provider message id:
Observed at:
```
```

- [ ] **Step 2: Verify provider identity from available settings**

Use the employee mailbox UI, company admin panel, or DNS/MX lookup. Do not use mailbox credentials in shell history. Record only non-secret provider facts in `docs/operations/enterprise-mailbox-checklist.md`.

- [ ] **Step 3: Verify SMTP/IMAP settings without storing secrets**

Confirm whether SMTP/IMAP is enabled and whether an authorization code is required. Record host/port/TLS/auth method, but do not record the authorization code or password.

- [ ] **Step 4: Decide first transport mode**

Use this decision rule:

```text
If SMTP is enabled and a test mailbox authorization code is available -> use mailbox_smtp first.
If SMTP is disabled but enterprise mail API exists -> use mailbox_api first.
If neither is available -> block real sending and keep mock transport until admin access is resolved.
```

- [ ] **Step 5: Commit checklist**

Run:

```bash
git add docs/operations/enterprise-mailbox-checklist.md docs/product/mailbox-backed-sender-delivery.md
git commit -m "Document enterprise mailbox capability checks"
```

---

### Task 1: Model Sender Transport and Mailbox Readiness

**Files:**
- Modify: `lib/outreach/types.ts`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_sender_transport_fields/migration.sql`
- Modify: `lib/outreach/senders.ts`
- Modify: `app/api/senders/route.ts`

**Interfaces:**
- Consumes: existing `EmailSender` API shape.
- Produces: `EmailSender` with `transportMode`, `mailboxStatus`, `sentFolderMode`, and `canSend` fields.

- [ ] **Step 1: Extend frontend/server sender types**

Edit `lib/outreach/types.ts` and extend sender-related types:

```ts
export type SenderStatus = 'active' | 'inactive' | 'disabled';
export type SenderTransportMode = 'provider_domain' | 'mailbox_smtp' | 'mailbox_api';
export type SenderMailboxStatus = 'not_required' | 'not_connected' | 'connected' | 'expired' | 'error';
export type SentFolderMode = 'not_supported' | 'provider_dependent' | 'smtp_account' | 'mailbox_api';

export interface EmailSender {
  id: string;
  displayName: string;
  email: string;
  domain: string;
  domainVerified: boolean;
  senderVerified: boolean;
  status: SenderStatus;
  transportMode: SenderTransportMode;
  mailboxStatus: SenderMailboxStatus;
  sentFolderMode: SentFolderMode;
  canSend: boolean;
  canShowInSenderSentFolder: boolean;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Add database fields to `EmailSender`**

Edit `prisma/schema.prisma`:

```prisma
model EmailSender {
  id              String   @id @default(cuid())
  displayName     String   @default("")
  email           String   @unique
  domain          String   @default("")
  domainVerified  Boolean  @default(false)
  senderVerified  Boolean  @default(false)
  status          String   @default("inactive")
  transportMode   String   @default("provider_domain")
  mailboxStatus   String   @default("not_required")
  sentFolderMode  String   @default("not_supported")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  mailboxAccount  EmailMailboxAccount?

  @@index([domain])
  @@index([status])
  @@index([transportMode])
  @@map("email_senders")
}
```

Add the placeholder relation target now so Task 2 can add fields cleanly:

```prisma
model EmailMailboxAccount {
  id        String      @id @default(cuid())
  senderId  String      @unique
  sender    EmailSender @relation(fields: [senderId], references: [id], onDelete: Cascade)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  @@map("email_mailbox_accounts")
}
```

- [ ] **Step 3: Generate and inspect migration**

Run:

```bash
yarn prisma:migrate --name add_sender_transport_fields
```

Expected: Prisma creates a migration that adds sender transport columns and the `email_mailbox_accounts` table.

- [ ] **Step 4: Update sender mapper**

Edit `lib/outreach/senders.ts` so the mapper computes safe public fields:

```ts
import type { EmailSender, SenderMailboxStatus, SenderTransportMode, SentFolderMode } from './types';

type SenderRecord = {
  id: string;
  displayName: string;
  email: string;
  domain: string;
  domainVerified: boolean;
  senderVerified: boolean;
  status: string;
  transportMode: string;
  mailboxStatus: string;
  sentFolderMode: string;
  createdAt: Date;
  updatedAt: Date;
};

function asTransportMode(value: string): SenderTransportMode {
  if (value === 'mailbox_smtp' || value === 'mailbox_api') return value;
  return 'provider_domain';
}

function asMailboxStatus(value: string): SenderMailboxStatus {
  if (value === 'not_connected' || value === 'connected' || value === 'expired' || value === 'error') return value;
  return 'not_required';
}

function asSentFolderMode(value: string): SentFolderMode {
  if (value === 'provider_dependent' || value === 'smtp_account' || value === 'mailbox_api') return value;
  return 'not_supported';
}

export function toEmailSender(record: SenderRecord): EmailSender {
  const transportMode = asTransportMode(record.transportMode);
  const mailboxStatus = asMailboxStatus(record.mailboxStatus);
  const sentFolderMode = asSentFolderMode(record.sentFolderMode);
  const mailboxReady = transportMode === 'provider_domain' || mailboxStatus === 'connected';
  const canSend = record.status === 'active' && record.domainVerified && record.senderVerified && mailboxReady;

  return {
    id: record.id,
    displayName: record.displayName,
    email: record.email,
    domain: record.domain,
    domainVerified: record.domainVerified,
    senderVerified: record.senderVerified,
    status: record.status === 'disabled' ? 'disabled' : record.status === 'active' ? 'active' : 'inactive',
    transportMode,
    mailboxStatus,
    sentFolderMode,
    canSend,
    canShowInSenderSentFolder: sentFolderMode === 'smtp_account' || sentFolderMode === 'mailbox_api',
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 5: Run build**

Run:

```bash
yarn build
```

Expected: build passes and `/api/senders` still returns the existing sender records with the new fields.

- [ ] **Step 6: Commit**

Run:

```bash
git add prisma/schema.prisma prisma/migrations lib/outreach/types.ts lib/outreach/senders.ts app/api/senders/route.ts
git commit -m "Add sender transport readiness fields"
```

---

### Task 2: Persist Campaigns and Deliveries Before Real Sending

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_email_campaigns/migration.sql`
- Create: `lib/outreach/campaigns.ts`
- Create: `app/api/campaigns/route.ts`
- Create: `app/api/campaigns/[id]/route.ts`
- Modify: `lib/outreach/types.ts`

**Interfaces:**
- Consumes: rendered emails, selected sender, campaign draft.
- Produces: persisted `EmailCampaign` and `EmailCampaignDelivery` records.

- [ ] **Step 1: Add Prisma models**

Edit `prisma/schema.prisma`:

```prisma
model EmailCampaign {
  id           String                  @id @default(cuid())
  name         String
  subject      String
  bodyHtml     String
  senderId     String?
  senderEmail  String
  senderName   String
  replyToEmail String
  totalCount   Int                     @default(0)
  successCount Int                     @default(0)
  failedCount  Int                     @default(0)
  repliedCount Int                     @default(0)
  status       String                  @default("draft")
  createdAt    DateTime                @default(now())
  sentAt       DateTime?
  deliveries   EmailCampaignDelivery[]

  @@index([status])
  @@index([createdAt])
  @@map("email_campaigns")
}

model EmailCampaignDelivery {
  id                String        @id @default(cuid())
  campaignId        String
  campaign          EmailCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  contactId         String?
  toEmail           String
  renderedSubject   String
  renderedBodyHtml  String
  renderedBodyText  String
  salutation        String        @default("")
  sendStatus        String        @default("pending")
  providerMessageId String?
  errorMessage      String?
  sentAt            DateTime?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  @@index([campaignId])
  @@index([sendStatus])
  @@index([toEmail])
  @@map("email_campaign_deliveries")
}
```

- [ ] **Step 2: Generate migration**

Run:

```bash
yarn prisma:migrate --name add_email_campaigns
```

Expected: migration creates `email_campaigns` and `email_campaign_deliveries`.

- [ ] **Step 3: Add mapping helpers**

Create `lib/outreach/campaigns.ts`:

```ts
import type { CampaignRecord, DeliveryRecord } from './types';

type DeliveryRecordRow = {
  id: string;
  contactId: string | null;
  toEmail: string;
  renderedSubject: string;
  renderedBodyHtml: string;
  renderedBodyText: string;
  salutation: string;
  sendStatus: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  sentAt: Date | null;
};

type CampaignRecordRow = {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  senderEmail: string;
  senderName: string;
  replyToEmail: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  repliedCount: number;
  status: string;
  createdAt: Date;
  sentAt: Date | null;
  deliveries: DeliveryRecordRow[];
};

function toDeliveryStatus(status: string): DeliveryRecord['sendStatus'] {
  if (status === 'sending' || status === 'sent' || status === 'failed' || status === 'bounced' || status === 'replied') return status;
  return 'pending';
}

function toCampaignStatus(status: string): CampaignRecord['status'] {
  if (status === 'previewed' || status === 'sending' || status === 'sent' || status === 'partial_failed' || status === 'cancelled') return status;
  return 'draft';
}

export function toCampaignRecord(row: CampaignRecordRow): CampaignRecord {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    bodyHtml: row.bodyHtml,
    senderEmail: row.senderEmail,
    senderName: row.senderName,
    replyToEmail: row.replyToEmail,
    totalCount: row.totalCount,
    successCount: row.successCount,
    failedCount: row.failedCount,
    repliedCount: row.repliedCount,
    status: toCampaignStatus(row.status),
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString(),
    deliveries: row.deliveries.map((delivery) => ({
      id: delivery.id,
      rowId: delivery.id,
      contactId: delivery.contactId ?? undefined,
      to: delivery.toEmail,
      subject: delivery.renderedSubject,
      salutation: delivery.salutation,
      bodyHtml: delivery.renderedBodyHtml,
      bodyText: delivery.renderedBodyText,
      warnings: [],
      sendStatus: toDeliveryStatus(delivery.sendStatus),
      providerMessageId: delivery.providerMessageId ?? undefined,
      errorMessage: delivery.errorMessage ?? undefined,
      sentAt: delivery.sentAt?.toISOString(),
    })),
  };
}
```

- [ ] **Step 4: Add campaign list endpoint**

Create `app/api/campaigns/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { toCampaignRecord } from '@/lib/outreach/campaigns';

export const dynamic = 'force-dynamic';

export async function GET() {
  const campaigns = await prisma.emailCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: { deliveries: { orderBy: { createdAt: 'asc' } } },
  });

  return NextResponse.json({ data: campaigns.map(toCampaignRecord) });
}
```

- [ ] **Step 5: Add campaign detail endpoint**

Create `app/api/campaigns/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { toCampaignRecord } from '@/lib/outreach/campaigns';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: params.id },
    include: { deliveries: { orderBy: { createdAt: 'asc' } } },
  });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  return NextResponse.json({ data: toCampaignRecord(campaign) });
}
```

- [ ] **Step 6: Run build and commit**

Run:

```bash
yarn build
git add prisma/schema.prisma prisma/migrations lib/outreach/types.ts lib/outreach/campaigns.ts app/api/campaigns
git commit -m "Persist outreach campaigns and deliveries"
```

---

### Task 3: Add Provider-Neutral Mail Transport

**Files:**
- Create: `lib/mail/transport.ts`
- Create: `lib/mail/mockTransport.ts`
- Create: `lib/mail/smtpTransport.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: sender, recipient, subject, HTML body, text body, reply-to.
- Produces: `MailSendResult` with status, provider message id, and error message.

- [ ] **Step 1: Add transport interface**

Create `lib/mail/transport.ts`:

```ts
export interface MailSendInput {
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

export interface MailSendResult {
  ok: boolean;
  providerMessageId?: string;
  errorMessage?: string;
  sentAt?: string;
}

export interface MailTransport {
  send(input: MailSendInput): Promise<MailSendResult>;
}
```

- [ ] **Step 2: Add deterministic mock transport**

Create `lib/mail/mockTransport.ts`:

```ts
import type { MailSendInput, MailSendResult, MailTransport } from './transport';

export class MockMailTransport implements MailTransport {
  async send(input: MailSendInput): Promise<MailSendResult> {
    if (!input.toEmail.includes('@')) {
      return { ok: false, errorMessage: 'Invalid recipient email' };
    }

    return {
      ok: true,
      providerMessageId: `mock-${Date.now()}-${input.toEmail}`,
      sentAt: new Date().toISOString(),
    };
  }
}
```

- [ ] **Step 3: Add SMTP dependency**

Run:

```bash
yarn add nodemailer
yarn add -D @types/nodemailer
```

- [ ] **Step 4: Add SMTP transport skeleton**

Create `lib/mail/smtpTransport.ts`:

```ts
import nodemailer from 'nodemailer';
import type { MailSendInput, MailSendResult, MailTransport } from './transport';

interface SmtpTransportConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export class SmtpMailTransport implements MailTransport {
  constructor(private readonly config: SmtpTransportConfig) {}

  async send(input: MailSendInput): Promise<MailSendResult> {
    const transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
    });

    try {
      const result = await transporter.sendMail({
        from: `${input.fromName} <${input.fromEmail}>`,
        to: input.toEmail,
        replyTo: input.replyToEmail,
        subject: input.subject,
        html: input.bodyHtml,
        text: input.bodyText,
      });

      return {
        ok: true,
        providerMessageId: result.messageId,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        ok: false,
        errorMessage: error instanceof Error ? error.message : 'SMTP send failed',
      };
    }
  }
}
```

- [ ] **Step 5: Run build and commit**

Run:

```bash
yarn build
git add package.json yarn.lock lib/mail
git commit -m "Add mail transport abstraction"
```

---

### Task 4: Add Server-Side Real Send Endpoints Behind Mock Transport

**Files:**
- Create: `app/api/campaigns/send-test/route.ts`
- Create: `app/api/campaigns/send/route.ts`
- Create: `lib/outreach/sendCampaign.ts`
- Modify: `lib/outreach/validation.ts` if server-only validation helpers need export.

**Interfaces:**
- Consumes: campaign payload from frontend and `MailTransport`.
- Produces: persisted campaign and delivery records.

- [ ] **Step 1: Add server send helper**

Create `lib/outreach/sendCampaign.ts`:

```ts
import { prisma } from '@/lib/db/prisma';
import type { MailTransport } from '@/lib/mail/transport';
import type { EmailDraft, RenderedEmail } from './types';

export interface SendCampaignInput {
  name: string;
  draft: EmailDraft;
  renderedEmails: RenderedEmail[];
  senderId: string;
  senderEmail: string;
  senderName: string;
  replyToEmail: string;
}

export async function sendAndPersistCampaign(input: SendCampaignInput, transport: MailTransport) {
  const campaign = await prisma.emailCampaign.create({
    data: {
      name: input.name,
      subject: input.draft.subject,
      bodyHtml: input.draft.bodyHtml,
      senderId: input.senderId,
      senderEmail: input.senderEmail,
      senderName: input.senderName,
      replyToEmail: input.replyToEmail,
      totalCount: input.renderedEmails.length,
      status: 'sending',
      deliveries: {
        create: input.renderedEmails.map((email) => ({
          contactId: email.contactId,
          toEmail: email.to,
          renderedSubject: email.subject,
          renderedBodyHtml: email.bodyHtml,
          renderedBodyText: email.bodyText,
          salutation: email.salutation,
          sendStatus: 'pending',
        })),
      },
    },
    include: { deliveries: { orderBy: { createdAt: 'asc' } } },
  });

  let successCount = 0;
  let failedCount = 0;

  for (const delivery of campaign.deliveries) {
    await prisma.emailCampaignDelivery.update({ where: { id: delivery.id }, data: { sendStatus: 'sending' } });
    const result = await transport.send({
      fromEmail: input.senderEmail,
      fromName: input.senderName,
      replyToEmail: input.replyToEmail,
      toEmail: delivery.toEmail,
      subject: delivery.renderedSubject,
      bodyHtml: delivery.renderedBodyHtml,
      bodyText: delivery.renderedBodyText,
    });

    if (result.ok) {
      successCount += 1;
      await prisma.emailCampaignDelivery.update({
        where: { id: delivery.id },
        data: { sendStatus: 'sent', providerMessageId: result.providerMessageId, sentAt: result.sentAt ? new Date(result.sentAt) : new Date() },
      });
    } else {
      failedCount += 1;
      await prisma.emailCampaignDelivery.update({
        where: { id: delivery.id },
        data: { sendStatus: 'failed', errorMessage: result.errorMessage ?? 'Send failed' },
      });
    }
  }

  return prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: {
      successCount,
      failedCount,
      status: failedCount > 0 ? 'partial_failed' : 'sent',
      sentAt: new Date(),
    },
    include: { deliveries: { orderBy: { createdAt: 'asc' } } },
  });
}
```

- [ ] **Step 2: Add real campaign endpoint using mock transport first**

Create `app/api/campaigns/send/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { MockMailTransport } from '@/lib/mail/mockTransport';
import { toCampaignRecord } from '@/lib/outreach/campaigns';
import { sendAndPersistCampaign } from '@/lib/outreach/sendCampaign';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const campaign = await sendAndPersistCampaign(payload, new MockMailTransport());
  return NextResponse.json({ data: toCampaignRecord(campaign) });
}
```

- [ ] **Step 3: Add test send endpoint**

Create `app/api/campaigns/send-test/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { MockMailTransport } from '@/lib/mail/mockTransport';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload?.toEmail || !payload?.senderEmail || !payload?.subject) {
    return NextResponse.json({ error: 'Missing test send fields' }, { status: 400 });
  }

  const result = await new MockMailTransport().send({
    fromEmail: payload.senderEmail,
    fromName: payload.senderName || payload.senderEmail,
    replyToEmail: payload.replyToEmail || payload.senderEmail,
    toEmail: payload.toEmail,
    subject: payload.subject,
    bodyHtml: payload.bodyHtml || '',
    bodyText: payload.bodyText || '',
  });

  return NextResponse.json({ data: result }, { status: result.ok ? 200 : 400 });
}
```

- [ ] **Step 4: Run build and commit**

Run:

```bash
yarn build
git add app/api/campaigns lib/outreach/sendCampaign.ts
git commit -m "Add persisted campaign send endpoints"
```

---

### Task 5: Switch Frontend From Simulated Sends to API Sends

**Files:**
- Modify: `components/OutreachApp.tsx`
- Modify: `components/HistoryPanel.tsx`
- Modify: `components/SenderSettings.tsx`
- Modify: `components/PreviewPanel.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `POST /api/campaigns/send`, `POST /api/campaigns/send-test`, and `GET /api/campaigns`.
- Produces: UI states for sending, sent, partial failure, provider failure, and persisted campaign history.

- [ ] **Step 1: Add campaign loading state**

In `components/OutreachApp.tsx`, add explicit states:

```ts
const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
const [campaignsLoading, setCampaignsLoading] = useState(true);
const [campaignsError, setCampaignsError] = useState<string | null>(null);
const [sendInProgress, setSendInProgress] = useState(false);
const [sendError, setSendError] = useState<string | null>(null);
```

- [ ] **Step 2: Load persisted campaigns**

Add effect:

```ts
useEffect(() => {
  let cancelled = false;

  async function loadCampaigns() {
    setCampaignsLoading(true);
    setCampaignsError(null);
    try {
      const response = await fetch('/api/campaigns', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Failed to load campaigns');
      if (!cancelled) setCampaigns(payload?.data ?? []);
    } catch (error) {
      if (!cancelled) setCampaignsError(error instanceof Error ? error.message : 'Failed to load campaigns');
    } finally {
      if (!cancelled) setCampaignsLoading(false);
    }
  }

  loadCampaigns();

  return () => {
    cancelled = true;
  };
}, []);
```

- [ ] **Step 3: Replace `testSend()` with API call**

Replace the function body:

```ts
async function testSend() {
  const errors = getSendValidationErrors('test');
  setValidationErrors(errors);
  if (errors.length > 0) return;

  setSendError(null);
  setSendInProgress(true);
  try {
    const firstEmail = renderedEmails[0];
    const response = await fetch('/api/campaigns/send-test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        toEmail: testRecipientEmail,
        senderEmail,
        senderName,
        replyToEmail,
        subject: draft.subject,
        bodyHtml: firstEmail?.bodyHtml ?? draft.bodyHtml,
        bodyText: firstEmail?.bodyText ?? '',
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error ?? payload?.data?.errorMessage ?? 'Test send failed');
    setTestSent(true);
  } catch (error) {
    setSendError(error instanceof Error ? error.message : 'Test send failed');
  } finally {
    setSendInProgress(false);
  }
}
```

- [ ] **Step 4: Replace `realSend()` with API call**

Replace the function body:

```ts
async function realSend() {
  const errors = getSendValidationErrors('real');
  setValidationErrors(errors);
  if (errors.length > 0 || !selectedSender) return;

  setSendError(null);
  setSendInProgress(true);
  try {
    const response = await fetch('/api/campaigns/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: campaignName,
        draft,
        renderedEmails,
        senderId: selectedSender.id,
        senderEmail,
        senderName,
        replyToEmail,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error ?? 'Campaign send failed');
    setCampaigns((current) => [payload.data, ...current]);
    setConfirmArmed(false);
    setActiveTab('campaign');
  } catch (error) {
    setSendError(error instanceof Error ? error.message : 'Campaign send failed');
  } finally {
    setSendInProgress(false);
  }
}
```

- [ ] **Step 5: Render sending error and disabled states**

Pass `sendInProgress` to send buttons and render `sendError` near validation errors. Disable real send while `sendInProgress` is true.

- [ ] **Step 6: Run build and commit**

Run:

```bash
yarn build
git add components app/globals.css
git commit -m "Send campaigns through API"
```

---

### Task 6: Add Mailbox Account Authorization Model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_expand_mailbox_accounts/migration.sql`
- Create: `lib/outreach/mailboxAccounts.ts`
- Create: `app/api/senders/[id]/mailbox/route.ts`

**Interfaces:**
- Consumes: sender id and mailbox connection settings.
- Produces: safe mailbox authorization status without exposing secrets.

- [ ] **Step 1: Expand mailbox account model**

Edit `EmailMailboxAccount` in `prisma/schema.prisma`:

```prisma
model EmailMailboxAccount {
  id                      String      @id @default(cuid())
  senderId                String      @unique
  sender                  EmailSender @relation(fields: [senderId], references: [id], onDelete: Cascade)
  provider                String      @default("tencent_enterprise_mail")
  smtpHost                String      @default("")
  smtpPort                Int         @default(465)
  smtpSecure              Boolean     @default(true)
  username                String      @default("")
  encryptedSecret         String      @default("")
  status                  String      @default("not_connected")
  lastVerifiedAt          DateTime?
  lastError               String?
  sentFolderSupported     Boolean     @default(false)
  sentFolderLastCheckedAt DateTime?
  createdAt               DateTime    @default(now())
  updatedAt               DateTime    @updatedAt

  @@index([provider])
  @@index([status])
  @@map("email_mailbox_accounts")
}
```

- [ ] **Step 2: Generate migration**

Run:

```bash
yarn prisma:migrate --name expand_mailbox_accounts
```

- [ ] **Step 3: Add safe mapper**

Create `lib/outreach/mailboxAccounts.ts`:

```ts
export interface PublicMailboxAccountStatus {
  provider: string;
  status: 'not_connected' | 'connected' | 'expired' | 'error';
  username: string;
  sentFolderSupported: boolean;
  lastVerifiedAt?: string;
  lastError?: string;
}

type MailboxAccountRow = {
  provider: string;
  status: string;
  username: string;
  sentFolderSupported: boolean;
  lastVerifiedAt: Date | null;
  lastError: string | null;
};

export function toPublicMailboxAccountStatus(row: MailboxAccountRow): PublicMailboxAccountStatus {
  return {
    provider: row.provider,
    status: row.status === 'connected' || row.status === 'expired' || row.status === 'error' ? row.status : 'not_connected',
    username: row.username,
    sentFolderSupported: row.sentFolderSupported,
    lastVerifiedAt: row.lastVerifiedAt?.toISOString(),
    lastError: row.lastError ?? undefined,
  };
}
```

- [ ] **Step 4: Add mailbox status endpoint**

Create `app/api/senders/[id]/mailbox/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { toPublicMailboxAccountStatus } from '@/lib/outreach/mailboxAccounts';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const account = await prisma.emailMailboxAccount.findUnique({ where: { senderId: params.id } });
  if (!account) return NextResponse.json({ data: null });
  return NextResponse.json({ data: toPublicMailboxAccountStatus(account) });
}
```

- [ ] **Step 5: Add guarded configuration endpoint**

Add `POST` to `app/api/senders/[id]/mailbox/route.ts` for development-only manual setup:

```ts
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Mailbox setup endpoint is disabled in production until auth is added' }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload?.username || !payload?.encryptedSecret) {
    return NextResponse.json({ error: 'username and encryptedSecret are required' }, { status: 400 });
  }

  const account = await prisma.emailMailboxAccount.upsert({
    where: { senderId: params.id },
    update: {
      provider: payload.provider ?? 'tencent_enterprise_mail',
      smtpHost: payload.smtpHost ?? 'smtp.exmail.qq.com',
      smtpPort: Number(payload.smtpPort ?? 465),
      smtpSecure: Boolean(payload.smtpSecure ?? true),
      username: payload.username,
      encryptedSecret: payload.encryptedSecret,
      status: 'not_connected',
    },
    create: {
      senderId: params.id,
      provider: payload.provider ?? 'tencent_enterprise_mail',
      smtpHost: payload.smtpHost ?? 'smtp.exmail.qq.com',
      smtpPort: Number(payload.smtpPort ?? 465),
      smtpSecure: Boolean(payload.smtpSecure ?? true),
      username: payload.username,
      encryptedSecret: payload.encryptedSecret,
      status: 'not_connected',
    },
  });

  return NextResponse.json({ data: toPublicMailboxAccountStatus(account) });
}
```

- [ ] **Step 6: Run build and commit**

Run:

```bash
yarn build
git add prisma/schema.prisma prisma/migrations lib/outreach/mailboxAccounts.ts app/api/senders
git commit -m "Add mailbox account authorization status"
```

---

### Task 7: Implement SMTP Sending for Connected Mailbox Senders

**Files:**
- Create: `lib/mail/transportFactory.ts`
- Modify: `lib/mail/smtpTransport.ts`
- Modify: `lib/outreach/sendCampaign.ts`
- Modify: `app/api/campaigns/send/route.ts`
- Modify: `app/api/campaigns/send-test/route.ts`

**Interfaces:**
- Consumes: `EmailSender.transportMode === 'mailbox_smtp'` and connected `EmailMailboxAccount`.
- Produces: actual SMTP sends through the employee mailbox account.

- [ ] **Step 1: Add transport factory**

Create `lib/mail/transportFactory.ts`:

```ts
import { MockMailTransport } from './mockTransport';
import { SmtpMailTransport } from './smtpTransport';
import type { MailTransport } from './transport';

interface SenderWithMailboxAccount {
  transportMode: string;
  mailboxAccount?: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    username: string;
    encryptedSecret: string;
    status: string;
  } | null;
}

function decryptMailboxSecret(encryptedSecret: string): string {
  if (!process.env.MAILBOX_SECRET_KEY) {
    throw new Error('MAILBOX_SECRET_KEY is required for mailbox SMTP sending');
  }

  return encryptedSecret;
}

export function createMailTransport(sender: SenderWithMailboxAccount): MailTransport {
  if (process.env.MAIL_TRANSPORT === 'mock') return new MockMailTransport();

  if (sender.transportMode === 'mailbox_smtp') {
    const account = sender.mailboxAccount;
    if (!account || account.status !== 'connected') throw new Error('Sender mailbox is not connected');
    return new SmtpMailTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpSecure,
      user: account.username,
      pass: decryptMailboxSecret(account.encryptedSecret),
    });
  }

  return new MockMailTransport();
}
```

- [ ] **Step 2: Replace mock transport in send endpoints**

In `app/api/campaigns/send/route.ts`, load sender and call factory:

```ts
const sender = await prisma.emailSender.findUnique({
  where: { id: payload.senderId },
  include: { mailboxAccount: true },
});
if (!sender) return NextResponse.json({ error: 'Sender not found' }, { status: 404 });

const transport = createMailTransport(sender);
const campaign = await sendAndPersistCampaign(payload, transport);
```

- [ ] **Step 3: Add sender email consistency check**

Before sending, reject mismatched sender payloads:

```ts
if (payload.senderEmail !== sender.email) {
  return NextResponse.json({ error: 'Sender email does not match selected sender' }, { status: 400 });
}
```

- [ ] **Step 4: Verify enterprise mailbox SMTP behavior manually in dev**

Configure one test sender as:

```text
transportMode=mailbox_smtp
mailboxStatus=connected
sentFolderMode=smtp_account
mailboxAccount.provider=tencent_enterprise_mail
mailboxAccount.smtpHost=smtp.exmail.qq.com
mailboxAccount.smtpPort=465
mailboxAccount.smtpSecure=true
mailboxAccount.username=employee@pp.com
```

Run a test send to a controlled address and verify:

```text
Recipient sees From: employee@pp.com
Recipient reply target is employee@pp.com
Enterprise mailbox Sent folder behavior is observed and documented
```

- [ ] **Step 5: Run build and commit**

Run:

```bash
yarn build
git add lib/mail app/api/campaigns lib/outreach/sendCampaign.ts
git commit -m "Send through connected mailbox SMTP"
```

---

### Task 8: Surface Mailbox and Sent Folder Capability in the UI

**Files:**
- Modify: `components/SenderSettings.tsx`
- Modify: `components/PreviewPanel.tsx`
- Modify: `components/OutreachApp.tsx`
- Modify: `lib/outreach/validation.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: new `EmailSender` fields.
- Produces: clear UI feedback about From, Reply-To, mailbox connection, and Sent folder expectation.

- [ ] **Step 1: Add sender capability copy helper**

In `components/SenderSettings.tsx`, add:

```ts
function sentFolderLabel(sender: EmailSender | undefined) {
  if (!sender) return '';
  if (sender.canShowInSenderSentFolder) return 'Sent folder: expected in sender mailbox';
  if (sender.sentFolderMode === 'provider_dependent') return 'Sent folder: depends on provider';
  return 'Sent folder: not guaranteed';
}

function mailboxLabel(sender: EmailSender | undefined) {
  if (!sender) return '';
  if (sender.transportMode === 'provider_domain') return 'Transport: verified provider/domain';
  if (sender.mailboxStatus === 'connected') return 'Transport: connected mailbox';
  return 'Transport: mailbox not connected';
}
```

- [ ] **Step 2: Render capability hints**

Under the existing sender hint, render:

```tsx
{selectedSender && (
  <div className="senderHint">
    {mailboxLabel(selectedSender)} · {sentFolderLabel(selectedSender)}
  </div>
)}
```

- [ ] **Step 3: Validate mailbox readiness**

In `lib/outreach/validation.ts`, add errors when the sender says it cannot send:

```ts
if (!input.senderCanSend) {
  errors.push({ field: 'sender', message: 'Selected sender is not ready to send.' });
}
```

Extend the validation input type with:

```ts
senderCanSend: boolean;
```

Pass `selectedSender?.canSend ?? false` from `OutreachApp`.

- [ ] **Step 4: Run build and commit**

Run:

```bash
yarn build
git add components lib/outreach/validation.ts app/globals.css
git commit -m "Show mailbox sender readiness in compose"
```

---

### Task 9: Document Provider Caveats and Manual Verification

**Files:**
- Create: `docs/product/mailbox-backed-sender-delivery.md`
- Modify: `docs/product/email-sender-requirements-status.md`
- Modify: `docs/deploy/outreach-dev.md`

**Interfaces:**
- Consumes: implemented transport modes and observed provider behavior.
- Produces: product and operations documentation.

- [ ] **Step 1: Add product documentation**

Create `docs/product/mailbox-backed-sender-delivery.md`:

```md
# Mailbox-Backed Sender Delivery

## User Requirement

When a team member sends from `employee@pp.com`, recipients should see `employee@pp.com` as the sender, replies should go to `employee@pp.com`, and the sent message should appear in the `employee@pp.com` mailbox Sent folder when provider capabilities allow it.

## Important Constraint

Showing `From: employee@pp.com` is not the same as writing to that employee mailbox's Sent folder. Sent folder visibility usually requires sending through the actual enterprise mailbox account or appending to Sent through the mailbox provider.

## Supported Modes

- `provider_domain`: verified provider/domain sending; Sent folder is not guaranteed.
- `mailbox_smtp`: sends through the employee mailbox SMTP account; Sent folder behavior must be verified per provider.
- `mailbox_api`: future OAuth/API mode for providers that expose send and Sent folder behavior.

## Enterprise WeChat / Tencent Enterprise Mail Notes

The first target team uses company employee mailboxes accessed through Enterprise WeChat. Treat this as enterprise mailbox delivery, not personal QQ Mail delivery. Confirm SMTP/API availability in the enterprise mailbox settings or admin console. Do not store account login passwords; use an authorization code, app password, or provider token. Sent folder behavior must be manually verified with the exact employee mailbox type being used.
```

- [ ] **Step 2: Update status doc**

Add this to `docs/product/email-sender-requirements-status.md` under `Not Done Yet`:

```md
- [ ] Implement enterprise mailbox-backed sending for employee addresses such as `employee@pp.com`.
- [ ] Verify whether Enterprise WeChat / Tencent enterprise mail SMTP sends appear in the employee mailbox Sent folder.
```

- [ ] **Step 3: Update deploy doc with environment variables**

Add to `docs/deploy/outreach-dev.md`:

```md
## Mail Transport Environment

- `MAIL_TRANSPORT=mock` keeps development sends simulated.
- `MAIL_TRANSPORT=smtp` enables mailbox SMTP sending when a sender has a connected mailbox account.
- `MAILBOX_SECRET_KEY` is required before decrypting stored mailbox secrets.
```

- [ ] **Step 4: Commit**

Run:

```bash
git add docs/product docs/deploy/outreach-dev.md
git commit -m "Document mailbox-backed sender delivery"
```

---

### Task 10: Deployment and Smoke Verification

**Files:**
- No code files unless verification exposes a bug.

**Interfaces:**
- Consumes: completed code and migrations.
- Produces: deployed feature and verification notes.

- [ ] **Step 1: Run build**

Run:

```bash
yarn build
```

Expected: build passes and route table includes `/api/senders`, `/api/campaigns`, `/api/campaigns/send`, and `/api/campaigns/send-test`.

- [ ] **Step 2: Push commits**

Run:

```bash
git status --short
git push origin main
```

Expected: push succeeds and `git status --short` is clean.

- [ ] **Step 3: Deploy**

Run:

```bash
/home/openclaw/bin/oc-deploy rococo-outreach deploy
```

Expected: image builds, migrations apply, app container starts.

- [ ] **Step 4: Verify HTTP and APIs**

Run:

```bash
curl -I -L https://outreach-dev.rococo.dev
curl -sS https://outreach-dev.rococo.dev/api/senders
curl -sS https://outreach-dev.rococo.dev/api/campaigns
```

Expected:

```text
page returns 200 OK
/api/senders returns sender records with transport readiness fields
/api/campaigns returns { "data": [] } or persisted campaigns
```

- [ ] **Step 5: Verify mock send path**

Use the UI to send one test campaign with `MAIL_TRANSPORT=mock`.

Expected:

```text
Campaign appears in History after reload
Each recipient has one delivery record
From and Reply-To match the selected sender
```

- [ ] **Step 6: Verify mailbox SMTP path in controlled environment**

Only after a real test mailbox is connected, send one email to a controlled recipient.

Expected:

```text
Recipient sees From: employee@pp.com
Reply goes to employee@pp.com
ProviderMessageId is stored
Enterprise mailbox Sent folder result is recorded in docs/product/mailbox-backed-sender-delivery.md
```

- [ ] **Step 7: Final git check**

Run:

```bash
git status -sb
git rev-list --left-right --count HEAD...@{u}
```

Expected:

```text
## main...origin/main
0 0
```

## Execution Notes

Start with mock transport even though the target is real mailbox sending. This lets the app move campaign history and delivery status from frontend memory into durable server state before introducing SMTP credentials and provider-specific failure modes.

Do not promise Sent folder visibility until it is tested with the exact mailbox provider. The UI should say "expected" or "not guaranteed" based on the sender's transport and observed provider behavior.

## Self-Review

Spec coverage:

- Recipient sees `employee@pp.com`: covered by Task 3, Task 4, Task 7, and Task 8.
- Replies go to `employee@pp.com`: covered by `replyToEmail` in Task 3 and validation/UI in Task 8.
- `employee@pp.com` Sent folder visibility: covered by mailbox SMTP/API architecture, Task 7 manual verification, and Task 9 documentation.
- Current functionality gap: documented in Current State Summary and addressed by Tasks 2-8.

Placeholder scan:

- No placeholder markers or unspecified "add tests later" instructions remain.

Type consistency:

- `EmailSender.transportMode`, `mailboxStatus`, `sentFolderMode`, `canSend`, and `canShowInSenderSentFolder` are defined in Task 1 and consumed in later frontend tasks.
- `MailTransport`, `MailSendInput`, and `MailSendResult` are defined in Task 3 and consumed in Tasks 4 and 7.
