# Tencent Enterprise Mail SMTP Configuration

## Confirmed Facts

- Provider: Tencent enterprise mail / Enterprise WeChat mail
- SMTP host: `smtp.exmail.qq.com`
- Client services visible in the mailbox UI: `IMAP/SMTP`, `POP/SMTP`
- Sent folder requirement: required before mailbox-backed sending is complete
- Secrets must be supplied through server-side environment or secret storage

## Connectivity Snapshot

Verified from `netcup2` on 2026-08-07:

- The OpenClaw development container and deployed Rococo Outreach application
  container can establish TLS 1.3 connections to port 465.
- Both containers can establish STARTTLS connections to port 587.
- The Tencent certificate for `*.exmail.qq.com` validates successfully.
- Nodemailer authentication succeeds on port 465 with `secure=true`.
- Nodemailer authentication on port 587 timed out during repeated checks even
  though raw TCP and STARTTLS handshakes succeeded. Treat 587 as network
  reachable but not application-verified until this behavior is resolved.

Use port 465 with implicit TLS for the current development mailbox. Keep port
587 as a possible fallback, not as automatic per-message failover.

## Non-Secret Settings

```text
SMTP host: smtp.exmail.qq.com
SMTP port: 465
SMTP TLS mode: implicit TLS (secure=true)
IMAP host: configured server-side; do not publish until IMAP is required
IMAP port: configured server-side; do not publish until IMAP is required
Authorization method: mailbox authorization code / app password
```

## Secret Handling

Never store mailbox login passwords, authorization codes, app passwords,
tokens, or mailbox cookies in docs, git, logs, API responses, or chat. The SMTP
test API must remain unavailable unless its server-only bearer token is set.

## Sent Folder Verification

SMTP connectivity and authentication do not prove that Tencent will place a
message in the employee mailbox Sent folder. Run one controlled test only after
the test endpoint is protected, then record:

```text
Test sender: recorded outside source control
Test recipient: recorded outside source control
Sent at:
Recipient saw the expected From address: yes/no
Reply target was the expected employee mailbox: yes/no
Message appeared in the employee mailbox Sent folder: yes/no
Provider message id:
```

If the Sent folder result is no, do not mark the feature complete. Investigate
IMAP append-to-sent or a Tencent mailbox API before implementing general sending.
