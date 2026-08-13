CREATE TABLE "email_campaign_audit_logs" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "deliveryId" TEXT,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'operator',
    "details" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_campaign_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_campaign_audit_logs_campaignId_createdAt_idx"
ON "email_campaign_audit_logs" ("campaignId", "createdAt");

CREATE INDEX "email_campaign_audit_logs_deliveryId_createdAt_idx"
ON "email_campaign_audit_logs" ("deliveryId", "createdAt");

CREATE INDEX "email_campaign_audit_logs_action_createdAt_idx"
ON "email_campaign_audit_logs" ("action", "createdAt");

ALTER TABLE "email_campaign_audit_logs"
ADD CONSTRAINT "email_campaign_audit_logs_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_campaign_audit_logs"
ADD CONSTRAINT "email_campaign_audit_logs_deliveryId_fkey"
FOREIGN KEY ("deliveryId") REFERENCES "email_campaign_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
