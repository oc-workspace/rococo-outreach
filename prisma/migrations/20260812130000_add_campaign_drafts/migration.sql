CREATE TABLE "email_campaign_drafts" (
  "id" TEXT NOT NULL,
  "workspaceKey" TEXT NOT NULL DEFAULT 'default',
  "campaignName" TEXT NOT NULL,
  "draftTitle" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bodyHtml" TEXT NOT NULL,
  "senderId" TEXT,
  "replyToEmail" TEXT NOT NULL DEFAULT '',
  "recipientRows" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_campaign_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_campaign_drafts_workspaceKey_key" ON "email_campaign_drafts"("workspaceKey");
CREATE INDEX "email_campaign_drafts_updatedAt_idx" ON "email_campaign_drafts"("updatedAt");
