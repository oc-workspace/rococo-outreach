ALTER TABLE "email_senders" ADD COLUMN "workspaceKey" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "email_senders" ADD COLUMN "teamKey" TEXT NOT NULL DEFAULT 'outreach';

CREATE INDEX "email_senders_workspaceKey_teamKey_idx" ON "email_senders"("workspaceKey", "teamKey");
