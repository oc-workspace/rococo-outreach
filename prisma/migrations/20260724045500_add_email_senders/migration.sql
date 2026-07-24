CREATE TABLE "email_senders" (
  "id" TEXT NOT NULL,
  "displayName" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL,
  "domain" TEXT NOT NULL DEFAULT '',
  "domainVerified" BOOLEAN NOT NULL DEFAULT false,
  "senderVerified" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'inactive',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_senders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_senders_email_key" ON "email_senders"("email");
CREATE INDEX "email_senders_domain_idx" ON "email_senders"("domain");
CREATE INDEX "email_senders_status_idx" ON "email_senders"("status");
