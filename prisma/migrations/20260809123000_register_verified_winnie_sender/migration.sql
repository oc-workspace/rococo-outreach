INSERT INTO "email_senders" (
  "id",
  "displayName",
  "email",
  "domain",
  "domainVerified",
  "senderVerified",
  "status",
  "createdAt",
  "updatedAt"
) VALUES (
  'smtp-winnie-next2p',
  'Winnie',
  'winnie@next2p.com',
  'next2p.com',
  true,
  true,
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO UPDATE SET
  "displayName" = EXCLUDED."displayName",
  "domain" = EXCLUDED."domain",
  "domainVerified" = EXCLUDED."domainVerified",
  "senderVerified" = EXCLUDED."senderVerified",
  "status" = EXCLUDED."status",
  "updatedAt" = CURRENT_TIMESTAMP;
