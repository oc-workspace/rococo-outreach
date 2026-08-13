CREATE TABLE "email_mailbox_accounts" (
  "id" TEXT NOT NULL,
  "workspaceKey" TEXT NOT NULL DEFAULT 'default',
  "provider" TEXT NOT NULL DEFAULT 'tencent_enterprise_mail',
  "mailboxEmail" TEXT NOT NULL,
  "smtpHost" TEXT NOT NULL,
  "smtpPort" INTEGER NOT NULL DEFAULT 465,
  "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'inactive',
  "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_mailbox_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_mailbox_accounts_mailboxEmail_key" ON "email_mailbox_accounts"("mailboxEmail");
CREATE INDEX "email_mailbox_accounts_workspaceKey_status_idx" ON "email_mailbox_accounts"("workspaceKey", "status");
CREATE INDEX "email_mailbox_accounts_verificationStatus_idx" ON "email_mailbox_accounts"("verificationStatus");

ALTER TABLE "email_senders" ADD COLUMN "mailboxAccountId" TEXT;
CREATE INDEX "email_senders_mailboxAccountId_idx" ON "email_senders"("mailboxAccountId");

INSERT INTO "email_mailbox_accounts" (
  "id", "workspaceKey", "provider", "mailboxEmail", "smtpHost", "smtpPort",
  "smtpSecure", "status", "verificationStatus", "verifiedAt", "createdAt", "updatedAt"
) VALUES (
  'mailbox-winnie-next2p', 'default', 'tencent_enterprise_mail',
  'winnie@next2p.com', 'smtp.exmail.qq.com', 465, true, 'active', 'verified',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("mailboxEmail") DO UPDATE SET
  "provider" = EXCLUDED."provider",
  "smtpHost" = EXCLUDED."smtpHost",
  "smtpPort" = EXCLUDED."smtpPort",
  "smtpSecure" = EXCLUDED."smtpSecure",
  "status" = EXCLUDED."status",
  "verificationStatus" = EXCLUDED."verificationStatus",
  "verifiedAt" = EXCLUDED."verifiedAt",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "email_senders"
SET "mailboxAccountId" = 'mailbox-winnie-next2p'
WHERE lower("email") = 'winnie@next2p.com';

ALTER TABLE "email_senders"
  ADD CONSTRAINT "email_senders_mailboxAccountId_fkey"
  FOREIGN KEY ("mailboxAccountId") REFERENCES "email_mailbox_accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
