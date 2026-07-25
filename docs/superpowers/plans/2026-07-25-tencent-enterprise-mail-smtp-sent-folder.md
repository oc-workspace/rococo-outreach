# Tencent Enterprise Mail SMTP Sent Folder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Track progress by changing checkboxes from `[ ]` to `[x]` as each step is completed.

**Goal:** Send Rococo Outreach emails from an employee Tencent enterprise mailbox such as `employee@pp.com`, make recipients see and reply to that exact mailbox, and require the message to appear in that employee mailbox's Sent folder before the feature is considered complete.

**Confirmed Product Facts:**

- The sender mailbox is a company employee mailbox, for example `employee@pp.com`.
- The mailbox is an enterprise mailbox, not a personal QQ mailbox.
- The enterprise mailbox service provider is Tencent / Enterprise WeChat mail.
- The employee can log in to the Enterprise WeChat mailbox web UI.
- The mailbox settings page exposes `Enable service` options for `IMAP/SMTP` and `POP/SMTP`.
- Product requirement: sent outreach email must appear in the employee mailbox's Sent folder.

**Primary Technical Decision:** Use `mailbox_smtp` first, backed by Tencent enterprise mail SMTP. Keep `mailbox_api` as the fallback only if SMTP cannot satisfy Sent-folder visibility.

## Requirement Summary

The feature is successful only when all three user-visible outcomes are true:

1. Recipient sees `From: employee@pp.com`.
2. Recipient replies to `employee@pp.com`.
3. The sent message appears in the `employee@pp.com` mailbox Sent folder.

Do not treat outcome 3 as optional. If Tencent SMTP does not write to Sent folder automatically, implementation must either add IMAP/API append-to-sent support or mark the SMTP-only approach blocked.

## Answer to Current Product Question

The SMTP page values usually appear after opening the mailbox web settings for client access and enabling `IMAP/SMTP` or `POP/SMTP`. The page may show the server address, port, SSL/TLS requirement, and authorization-code flow.

The user should not share the authorization code or password in chat or docs. The only values that are safe to record in planning docs are non-secret settings:

```text
SMTP host
SMTP port
SMTP SSL/TLS mode
IMAP host
IMAP port
Provider name
Whether authorization code/app password is required
```

If the settings page shows only an authorization-code button but not host/port, use Tencent enterprise mail documentation or admin-provided settings for host/port. Verify with the actual page before deploying.

## Target Data Flow

```text
SenderSettings
  -> selected EmailSender employee@pp.com
  -> server validates sender belongs to allowed team/workspace
  -> server validates mailbox account is connected
  -> server sends one email per recipient through Tencent enterprise SMTP
  -> recipient sees From employee@pp.com
  -> reply target is employee@pp.com
  -> server records campaign and delivery status
  -> verification confirms message appears in employee@pp.com Sent folder
  -> UI shows Sent folder support as verified
```

## Data Model

Use or extend the existing planned sender transport fields:

```ts
type SenderTransportMode = 'provider_domain' | 'mailbox_smtp' | 'mailbox_api';
type SentFolderMode = 'not_supported' | 'provider_dependent' | 'smtp_account' | 'mailbox_api';
```

For Tencent enterprise mail, use:

```text
provider=tencent_enterprise_mail
transportMode=mailbox_smtp
sentFolderMode=smtp_account only after real Sent-folder verification passes
```

Before verification, expose the sender as connected but with `sentFolderStatus=pending_verification` or equivalent. Do not show it as Sent-folder supported until tested.

## Task 1: Record Tencent Enterprise Mail Configuration Facts

**Files:**

- Create: `docs/operations/tencent-enterprise-mail-smtp.md`
- Modify: `docs/product/email-sender-requirements-status.md`

**Steps:**

- [ ] Create `docs/operations/tencent-enterprise-mail-smtp.md` with the confirmed facts above.
- [ ] Add a section for non-secret SMTP/IMAP settings.
- [ ] Record whether the web UI exposes `IMAP/SMTP` and `POP/SMTP` enablement.
- [ ] Record that Sent folder visibility is a hard requirement.
- [ ] Do not record authorization codes, passwords, cookies, tokens, or screenshots containing secrets.
- [ ] Update `docs/product/email-sender-requirements-status.md` so it says the current target provider is Tencent enterprise mail and Sent folder visibility is required.
- [ ] Commit with `git commit -m "Document Tencent enterprise mail SMTP requirements"`.

Template for `docs/operations/tencent-enterprise-mail-smtp.md`:

```md
# Tencent Enterprise Mail SMTP Configuration

## Confirmed Facts

- Provider: Tencent enterprise mail / Enterprise WeChat mail
- Sender format: `employee@pp.com`
- Web access: employee can log in through Enterprise WeChat mailbox web UI
- Client services visible: `IMAP/SMTP`, `POP/SMTP`
- Sent folder requirement: required

## Non-Secret Settings

- SMTP host:
- SMTP port:
- SMTP SSL/TLS:
- IMAP host:
- IMAP port:
- IMAP SSL/TLS:
- Authorization method: authorization code / app password / enterprise token

## Secret Handling

Never store login passwords, authorization codes, app passwords, tokens, or mailbox cookies in docs, git, logs, or chat.

## Sent Folder Verification

- Test sender:
- Test recipient:
- Sent at:
- Recipient saw From as employee@pp.com: yes/no
- Reply target was employee@pp.com: yes/no
- Message appeared in employee@pp.com Sent folder: yes/no
- Provider message id:
```

## Task 2: Add Mailbox Connection and Safe Status API

**Files:**

- Modify: `prisma/schema.prisma`
- Create migration under `prisma/migrations/`
- Create: `lib/outreach/mailboxAccounts.ts`
- Create: `app/api/senders/[id]/mailbox/route.ts`
- Modify: `app/api/senders/route.ts`
- Modify: `lib/outreach/types.ts`

**Steps:**

- [ ] Add an `EmailMailboxAccount` model linked one-to-one to `EmailSender`.
- [ ] Store `provider`, `smtpHost`, `smtpPort`, `smtpSecure`, `username`, encrypted secret reference/value, status, last verification fields, and Sent-folder verification fields.
- [ ] Add public sender fields for mailbox connection state and Sent-folder state.
- [ ] Ensure `/api/senders` never returns secrets.
- [ ] Add a development-only mailbox setup endpoint until real auth and admin flows exist.
- [ ] Run migration and Prisma generate.
- [ ] Run `yarn build`.
- [ ] Commit with `git commit -m "Add Tencent mailbox connection status"`.

## Task 3: Implement Tencent SMTP Transport

**Files:**

- Add dependency: `nodemailer` and types if required
- Create: `lib/mail/transport.ts`
- Create: `lib/mail/smtpTransport.ts`
- Create: `lib/mail/transportFactory.ts`
- Modify: `lib/outreach/send.ts` or create server-only campaign send module

**Steps:**

- [ ] Add a provider-neutral `MailTransport` interface.
- [ ] Implement SMTP sending with `from`, `replyTo`, one `to`, `subject`, HTML body, and text fallback.
- [ ] Enforce one independent email per recipient.
- [ ] Reject sends when selected sender email does not match the connected mailbox username.
- [ ] Reject sends when mailbox account is not connected.
- [ ] Do not log SMTP credentials or full message content.
- [ ] Preserve provider response message id when available.
- [ ] Run `yarn build`.
- [ ] Commit with `git commit -m "Send through Tencent enterprise mailbox SMTP"`.

## Task 4: Persist Campaign and Delivery Results

**Files:**

- Modify: `prisma/schema.prisma`
- Create migration under `prisma/migrations/`
- Create: `lib/outreach/campaigns.ts`
- Create: `app/api/campaigns/send-test/route.ts`
- Create: `app/api/campaigns/send/route.ts`
- Create: `app/api/campaigns/route.ts`
- Create: `app/api/campaigns/[id]/route.ts`

**Steps:**

- [ ] Add campaign and delivery tables.
- [ ] Store sender id, sender email, reply-to email, subject, sanitized body reference/content, delivery status, provider message id, sent timestamp, and error summary.
- [ ] Add test-send endpoint for one controlled recipient.
- [ ] Add campaign-send endpoint for selected recipients.
- [ ] Make backend validation authoritative for sender readiness.
- [ ] Return structured success and failure states for frontend rendering.
- [ ] Run `yarn build`.
- [ ] Commit with `git commit -m "Persist Tencent mailbox campaign deliveries"`.

## Task 5: Verify Sent Folder Requirement

**Files:**

- Modify: `docs/operations/tencent-enterprise-mail-smtp.md`
- Modify: `docs/product/email-sender-requirements-status.md`
- Modify code only if SMTP alone does not satisfy Sent-folder requirement.

**Steps:**

- [ ] Enable `IMAP/SMTP` for the employee mailbox in the web UI.
- [ ] Generate an authorization code/app password if Tencent requires one.
- [ ] Configure one development sender for `employee@pp.com` using non-secret host/port values and secret storage for the authorization code.
- [ ] Send one test email to a controlled recipient.
- [ ] Confirm recipient sees `From: employee@pp.com`.
- [ ] Confirm recipient reply target is `employee@pp.com`.
- [ ] Confirm the email appears in `employee@pp.com` Sent folder.
- [ ] Record the yes/no result and provider message id in `docs/operations/tencent-enterprise-mail-smtp.md`.
- [ ] If Sent folder is yes, set sender Sent-folder mode/status to verified.
- [ ] If Sent folder is no, do not mark the feature complete; implement Task 6.
- [ ] Commit with `git commit -m "Verify Tencent enterprise sent folder behavior"`.

## Task 6: Fallback if SMTP Does Not Populate Sent Folder

**Files:**

- Create: `lib/mail/imapSentAppender.ts` if IMAP append is supported
- Or create: `lib/mail/tencentEnterpriseMailApi.ts` if Tencent API is the chosen path
- Modify: `lib/mail/transportFactory.ts`
- Modify: sender Sent-folder status mapping

**Steps:**

- [ ] Confirm whether IMAP append to Sent is allowed for the mailbox.
- [ ] If allowed, append a copy of the sent message to the Sent folder after SMTP send.
- [ ] If IMAP append is not allowed, confirm whether Tencent enterprise mail API can send as the mailbox and place the message in Sent.
- [ ] If neither path is available, mark Sent-folder requirement blocked in docs and UI.
- [ ] Run a second controlled test send.
- [ ] Do not mark Sent-folder support verified until the employee mailbox Sent folder contains the message.
- [ ] Run `yarn build`.
- [ ] Commit with `git commit -m "Support Tencent sent folder synchronization"`.

## Task 7: Update Frontend Sender and History UI

**Files:**

- Modify: `components/SenderSettings.tsx`
- Modify: `components/PreviewPanel.tsx`
- Modify: `components/HistoryPanel.tsx`
- Modify: `components/OutreachApp.tsx`
- Modify: `lib/outreach/validation.ts`

**Steps:**

- [ ] Show mailbox provider as Tencent enterprise mail.
- [ ] Show connection state: not connected, connecting, connected, error, expired.
- [ ] Show Sent-folder state: pending verification, verified, not supported, blocked.
- [ ] Disable real send when mailbox is not connected.
- [ ] Disable or warn when Sent-folder support is required but not verified.
- [ ] Replace frontend-only campaign history with server-loaded campaign history.
- [ ] Keep preview clear: From, Reply-To, sender status, Sent-folder status.
- [ ] Handle loading, empty, error, disabled, and success states explicitly.
- [ ] Run `yarn build`.
- [ ] Commit with `git commit -m "Surface Tencent mailbox delivery status"`.

## Task 8: Deploy and Smoke Test

**Files:**

- No code files unless verification exposes a bug.

**Steps:**

- [ ] Run `yarn build`.
- [ ] Push commits to `origin/main`.
- [ ] Deploy with the existing Rococo Outreach deploy process.
- [ ] Verify `https://outreach-dev.rococo.dev` returns 200.
- [ ] Verify `/api/senders` includes Tencent mailbox connection and Sent-folder status fields.
- [ ] Verify test-send works with a controlled recipient.
- [ ] Verify campaign history persists after reload.
- [ ] Verify Sent-folder result is documented.
- [ ] Run final `git status -sb` and upstream count check.

## Completion Criteria

This plan is complete only when:

- `employee@pp.com` can be selected as an allowed sender.
- Backend sends through the connected Tencent enterprise mailbox.
- Recipient sees `From: employee@pp.com`.
- Reply target is `employee@pp.com`.
- The sent message appears in `employee@pp.com` Sent folder.
- Frontend displays mailbox connection and Sent-folder status honestly.
- Secrets are not stored in git, docs, logs, or chat.
- Build passes and deployment smoke checks pass.
