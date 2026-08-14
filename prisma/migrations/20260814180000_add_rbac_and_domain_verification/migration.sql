CREATE TABLE "outreach_workspaces" (
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "outreach_workspaces_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "outreach_teams" (
  "id" TEXT NOT NULL,
  "workspaceKey" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "outreach_teams_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outreach_teams_workspaceKey_key_key" ON "outreach_teams"("workspaceKey", "key");
CREATE INDEX "outreach_teams_workspaceKey_idx" ON "outreach_teams"("workspaceKey");

CREATE TABLE "outreach_members" (
  "id" TEXT NOT NULL,
  "workspaceKey" TEXT NOT NULL,
  "teamKey" TEXT NOT NULL,
  "actorKey" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'viewer',
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "outreach_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outreach_members_workspaceKey_teamKey_actorKey_key" ON "outreach_members"("workspaceKey", "teamKey", "actorKey");
CREATE INDEX "outreach_members_actorKey_status_idx" ON "outreach_members"("actorKey", "status");

CREATE TABLE "email_domain_verifications" (
  "id" TEXT NOT NULL,
  "workspaceKey" TEXT NOT NULL,
  "teamKey" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'dns_txt',
  "status" TEXT NOT NULL DEFAULT 'unverified',
  "token" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3),
  "lastCheckedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_domain_verifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_domain_verifications_workspaceKey_teamKey_domain_key" ON "email_domain_verifications"("workspaceKey", "teamKey", "domain");
CREATE INDEX "email_domain_verifications_workspaceKey_teamKey_status_idx" ON "email_domain_verifications"("workspaceKey", "teamKey", "status");

INSERT INTO "outreach_workspaces" ("key", "name", "createdAt", "updatedAt")
VALUES ('default', 'Default workspace', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "outreach_teams" ("id", "workspaceKey", "key", "name", "createdAt", "updatedAt")
VALUES ('team-default-outreach', 'default', 'outreach', 'Outreach', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("workspaceKey", "key") DO NOTHING;

INSERT INTO "outreach_members" ("id", "workspaceKey", "teamKey", "actorKey", "role", "status", "createdAt", "updatedAt")
VALUES ('member-default-operator', 'default', 'outreach', 'operator', 'owner', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("workspaceKey", "teamKey", "actorKey") DO UPDATE SET "role" = 'owner', "status" = 'active', "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "email_domain_verifications" ("id", "workspaceKey", "teamKey", "domain", "method", "status", "token", "verifiedAt", "createdAt", "updatedAt")
VALUES ('domain-default-next2p', 'default', 'outreach', 'next2p.com', 'legacy', 'verified', 'legacy-verified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("workspaceKey", "teamKey", "domain") DO NOTHING;

ALTER TABLE "outreach_teams" ADD CONSTRAINT "outreach_teams_workspaceKey_fkey"
  FOREIGN KEY ("workspaceKey") REFERENCES "outreach_workspaces"("key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_members" ADD CONSTRAINT "outreach_members_workspaceKey_fkey"
  FOREIGN KEY ("workspaceKey") REFERENCES "outreach_workspaces"("key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_members" ADD CONSTRAINT "outreach_members_workspaceKey_teamKey_fkey"
  FOREIGN KEY ("workspaceKey", "teamKey") REFERENCES "outreach_teams"("workspaceKey", "key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_senders" ADD CONSTRAINT "email_senders_workspaceKey_fkey"
  FOREIGN KEY ("workspaceKey") REFERENCES "outreach_workspaces"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "email_senders" ADD CONSTRAINT "email_senders_workspaceKey_teamKey_fkey"
  FOREIGN KEY ("workspaceKey", "teamKey") REFERENCES "outreach_teams"("workspaceKey", "key") ON DELETE RESTRICT ON UPDATE CASCADE;
