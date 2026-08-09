ALTER TABLE "email_campaign_deliveries" ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "email_campaign_deliveries" ADD COLUMN "lastAttemptAt" TIMESTAMP(3);

CREATE TABLE "email_campaign_retries" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'sending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "email_campaign_retries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_campaign_retries_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "email_campaign_retries_idempotencyKey_key" ON "email_campaign_retries"("idempotencyKey");
CREATE INDEX "email_campaign_retries_campaignId_idx" ON "email_campaign_retries"("campaignId");
CREATE INDEX "email_campaign_retries_status_idx" ON "email_campaign_retries"("status");
