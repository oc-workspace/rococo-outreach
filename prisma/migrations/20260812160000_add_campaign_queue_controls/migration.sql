ALTER TABLE "email_campaigns"
ADD COLUMN "cancelledCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "simulationFailureRecipient" TEXT;

CREATE INDEX "email_campaign_deliveries_campaignId_sendStatus_createdAt_idx"
ON "email_campaign_deliveries" ("campaignId", "sendStatus", "createdAt");

CREATE TABLE "email_send_rate_limits" (
    "key" TEXT NOT NULL,
    "nextAllowedAt" TIMESTAMPTZ(3) NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "email_send_rate_limits_pkey" PRIMARY KEY ("key")
);
