ALTER TABLE "email_templates"
  ADD COLUMN "templateKey" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "purpose" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "email_templates"
SET "templateKey" = "id"
WHERE "templateKey" = '';

CREATE INDEX "email_templates_templateKey_isCurrent_idx"
  ON "email_templates"("templateKey", "isCurrent");
CREATE UNIQUE INDEX "email_templates_templateKey_version_key"
  ON "email_templates"("templateKey", "version");
