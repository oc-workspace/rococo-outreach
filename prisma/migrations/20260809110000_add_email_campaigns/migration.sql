CREATE TABLE "email_campaigns" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bodyHtml" TEXT NOT NULL,
  "senderId" TEXT,
  "senderEmail" TEXT NOT NULL,
  "senderName" TEXT NOT NULL,
  "replyToEmail" TEXT NOT NULL,
  "totalCount" INTEGER NOT NULL DEFAULT 0,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "repliedCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_campaign_deliveries" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "contactId" TEXT,
  "toEmail" TEXT NOT NULL,
  "renderedSubject" TEXT NOT NULL,
  "renderedBodyHtml" TEXT NOT NULL,
  "renderedBodyText" TEXT NOT NULL,
  "salutation" TEXT NOT NULL DEFAULT '',
  "sendStatus" TEXT NOT NULL DEFAULT 'pending',
  "providerMessageId" TEXT,
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_campaign_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_campaign_deliveries_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "email_campaigns_status_idx" ON "email_campaigns"("status");
CREATE INDEX "email_campaigns_createdAt_idx" ON "email_campaigns"("createdAt");
CREATE INDEX "email_campaign_deliveries_campaignId_idx" ON "email_campaign_deliveries"("campaignId");
CREATE INDEX "email_campaign_deliveries_sendStatus_idx" ON "email_campaign_deliveries"("sendStatus");
CREATE INDEX "email_campaign_deliveries_toEmail_idx" ON "email_campaign_deliveries"("toEmail");
