# Email Sender Requirements and Status

## Purpose

Rococo Outreach needs an explicit sender model because every campaign email has four required delivery-facing parts:

```text
From: sender
To: recipient
Subject: campaign subject
Body: campaign body
```

The early UI already covered recipients, campaign draft content, preview, test recipient email, and campaign history. The missing product concept was `Sender`: who the email is sent from and where replies should go.

## Product Requirement

For each workspace or customer team, the app should expose only senders that are allowed to send outreach emails.

Example target shape:

- Team/company domain: `pp.com`
- Allowed sender 1: `employee1@pp.com`
- Allowed sender 2: `employee2@pp.com`

If the sender address is `employee1@qq.com`, then the sender domain is `qq.com`, not `pp.com`. That can still be supported later, but it is a different verification and ownership model. The product should decide whether senders must use the team's verified domain or whether external mailbox domains are also allowed.

## Frontend Decision

Use a `Sender settings` module in the Compose flow.

The first safe version should not let users freely type any sender email. The UI should fetch allowed senders from the server and let the user select one. The server remains authoritative for sender verification, domain verification, status, permissions, and future provider eligibility.

## Mental Model

Sender state is remote data, not local configuration.

The Compose UI owns the current selection and reply-to draft value, but it does not own which senders are valid. The server owns the sender list and verification fields.

## State / Data Flow

Current implemented flow:

```text
PostgreSQL email_senders
  -> Prisma EmailSender model
  -> GET /api/senders
  -> OutreachApp sender state
  -> SenderSettings select
  -> Preview / protected test send / protected Campaign send / persisted history
```

Current API contract:

```ts
interface SenderListResponse {
  data: EmailSender[];
}

interface EmailSender {
  id: string;
  displayName: string;
  email: string;
  domain: string;
  domainVerified: boolean;
  senderVerified: boolean;
  status: 'active' | 'inactive' | 'disabled';
  createdAt: string;
  updatedAt: string;
}
```

## Component Boundary

Implemented frontend boundaries:

- `components/OutreachApp.tsx` owns fetching senders, loading/error state, selected sender id, reply-to state, and send validation inputs.
- `components/SenderSettings.tsx` renders the sender select, reply-to input, loading state, empty state, error state, and verified/not verified signal.
- `components/PreviewPanel.tsx` displays the selected sender and reply-to before sending.
- `components/HistoryPanel.tsx` displays sender and reply-to in campaign history.
- `lib/outreach/validation.ts` blocks sending when sender data is missing, invalid, unverified, disabled, or inactive.
- `app/api/senders/route.ts` returns sender records from the database.

## Completed

- [x] Added visible `Sender settings` to the Compose flow.
- [x] Added `Sender name`, `Sender email`, and `Reply-to email` into preview, test send, protected Campaign sending, and campaign history state.
- [x] Added validation for sender name, sender email, reply-to email, domain verification, sender verification, and active sender status.
- [x] Added loading, empty, error, disabled, verified, and not verified UI states for senders.
- [x] Stabilized the `/api/senders` response shape with `createdAt` and `updatedAt`.
- [x] Added persistent Prisma `EmailSender` model mapped to `email_senders`.
- [x] Added sender mapping helpers in `lib/outreach/senders.ts`.
- [x] Switched `/api/senders` from seed data to database-backed records.
- [x] Seeded the current two allowed senders in a migration.
- [x] Added deploy-time `prisma migrate deploy` so sender migrations are applied on deployment.
- [x] Fixed the Docker runtime image so generated Prisma Client is copied into the deployed container.
- [x] Tightened frontend state so a stale selected sender id is corrected after sender reloads.
- [x] Disabled reply-to input while senders are loading or unavailable.
- [x] Built, pushed, deployed, and smoke-verified the current sender persistence flow.
- [x] Confirmed Tencent enterprise mail / Enterprise WeChat mail as the current mailbox provider target.
- [x] Implemented a provider-neutral SMTP transport with bounded connection, greeting, and socket timeouts.
- [x] Verified port 465 implicit TLS and mailbox authentication from the deployed application container.
- [x] Verified that port 587 is network/STARTTLS reachable, while recording that Nodemailer authentication is not yet stable on that port.
- [x] Added a non-sending SMTP `verify()` operation and enforced safe 465/587 TLS configuration pairs.
- [x] Protected the development SMTP test endpoint with a server-side bearer token, masked addresses, sanitized errors, private/no-store responses, and per-process rate limits.
- [x] Added a protected campaign-send API backed by Tencent enterprise mail SMTP.
- [x] Enforced active/verified sender eligibility, exact equality with the configured SMTP mailbox, and matching Reply-To at the campaign-send API layer.
- [x] Persisted campaign and per-recipient delivery records before sending, including provider message IDs, safe errors, attempt counts, and timestamps.
- [x] Connected the frontend Campaign send action and Campaign History to the protected persistent APIs.
- [x] Added idempotency protection for sends and explicit idempotent retry for failed deliveries.
- [x] Completed controlled port 465 test and Campaign sends and verified recipient delivery, `From`, `Reply-To`, and Tencent Sent-folder visibility.
- [x] Verified partial-failure persistence and manual retry without duplicate delivery attempts by using the development-only simulated-failure path.

## Not Done Yet

- [ ] Decide the final product rule for sender domains:
  - require the team domain, for example `employee1@pp.com`; or
  - allow external mailbox domains, for example `employee1@qq.com`.
- [ ] Add a real sender management UI for creating, editing, disabling, or deleting senders.
- [ ] Add write APIs for sender management, if the product wants sender management inside this app.
- [ ] Add workspace/team ownership and permissions for sender records.
- [ ] Add a real domain and sender verification workflow, including provider/DNS status if needed.
- [ ] Replace the current single SMTP mailbox environment configuration with a persistent mailbox-account authorization model before supporting multiple mailbox-backed senders.
- [ ] Add application-wide authentication and authorization for contact, template, campaign-history, and sender data. The send and retry endpoints already have a development bearer-token gate, but the rest of the internal tool is not yet protected at the application layer.
- [ ] Add campaign pacing, a durable send queue, and a way to stop deliveries that have not started before increasing send volume.
- [ ] Add browser-level interaction tests for sender selection and invalid sender recovery.

## Risks / Tradeoffs

The frontend can make sender selection visible and difficult to misuse, but it cannot prove whether an address is allowed to send. The backend and mail provider integration must remain the final authority.

Free text sender input is flexible, but it makes invalid or spoofed sender addresses easy. A server-provided sender list is less flexible, but it matches the real constraints of Resend, SMTP, and domain verification.

## Current Verification Snapshot

Verified on `netcup2` through 2026-08-11:

- `https://outreach-dev.rococo.dev` returns `200 OK`.
- `GET /api/senders` returns two database-backed sender records.
- `GET /api/contacts` returns contact data.
- Both 465 implicit TLS and 587 STARTTLS pass TCP/TLS certificate checks from the application container.
- Nodemailer authentication succeeds on 465 with `secure=true`.
- Nodemailer verification on 587 times out and is not approved for application use yet.
- The protected endpoint passes unauthenticated, authenticated/masked, non-sending verification, and disabled-by-default integration checks.
- The protected Campaign endpoint sends through the exact configured Tencent mailbox, persists Campaign and Delivery records, and rejects unauthenticated requests.
- One controlled test send and one controlled Campaign send passed recipient delivery, `From`, `Reply-To`, and Sent-folder checks.
- Idempotent send, idempotent manual retry, and partial-failure recovery checks passed without duplicate sends.
- `yarn build` passes.

## Open Questions

1. Should a team with domain `pp.com` only use sender emails under `pp.com`?
2. If addresses like `employee1@qq.com` are allowed, who owns verification and permission for those external mailbox domains?
3. Should sender management live inside Rococo Outreach, or should it be configured elsewhere and exposed here as read-only data?
