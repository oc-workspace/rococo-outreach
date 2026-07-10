CREATE TABLE "email_contacts" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL DEFAULT '',
  "displayName" TEXT NOT NULL DEFAULT '',
  "salutation" TEXT NOT NULL DEFAULT '',
  "language" TEXT NOT NULL DEFAULT 'en',
  "company" TEXT NOT NULL DEFAULT '',
  "mediaName" TEXT NOT NULL DEFAULT '',
  "role" TEXT NOT NULL DEFAULT '',
  "country" TEXT NOT NULL DEFAULT '',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_contacts_email_idx" ON "email_contacts"("email");
CREATE INDEX "email_contacts_status_idx" ON "email_contacts"("status");

INSERT INTO "email_contacts" ("id", "email", "displayName", "salutation", "language", "company", "mediaName", "role", "country", "tags", "notes", "status") VALUES
  ('contact-1', 'editor@techdaily.example', 'Maya Chen', 'Hi Maya', 'en', 'Tech Daily', 'Tech Daily', 'Editor', 'US', ARRAY['media', 'ai']::TEXT[], 'Prefers concise product context.', 'active'),
  ('contact-2', 'founder@remoteletter.example', 'Kenji Sato', 'Sato-san', 'ja', 'Remote Letter', 'Remote Letter', 'Founder', 'JP', ARRAY['remote', 'newsletter']::TEXT[], 'Often covers remote work tools.', 'active'),
  ('contact-3', 'partnerships@blocked.example', 'Blocked Contact', '', 'en', 'Blocked Media', 'Blocked Media', 'Partnerships', 'US', ARRAY['blocked']::TEXT[], 'Do not send until manually reactivated.', 'blocked')
ON CONFLICT ("id") DO NOTHING;
