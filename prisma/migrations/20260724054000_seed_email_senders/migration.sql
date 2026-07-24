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
) VALUES
  (
    'pp-employee-1',
    'Employee Name 1',
    'employeename1@pp.com',
    'pp.com',
    true,
    true,
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'pp-employee-2',
    'Employee Name 2',
    'employeename2@pp.com',
    'pp.com',
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
