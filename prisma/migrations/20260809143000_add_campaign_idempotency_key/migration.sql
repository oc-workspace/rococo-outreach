ALTER TABLE "email_campaigns" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "email_campaigns_idempotencyKey_key" ON "email_campaigns"("idempotencyKey");
