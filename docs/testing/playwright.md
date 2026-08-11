# Playwright browser tests

## Scope

The Playwright baseline covers:

- application login and unauthenticated API rejection;
- CSV preview, invalid rows, import, and repeated import;
- status/tag filtering, select-visible, and blocked-contact protection;
- sender selection and recovery to the valid default after reload;
- template save, refresh persistence, and template application;
- Campaign preview, second confirmation, simulated send, idempotency, partial
  failure persistence, and failed-recipient retry.

## Safety boundary

Run the suite with:

```bash
yarn test:e2e
```

The wrapper starts a temporary PostgreSQL 16 instance on a random loopback
port, applies all Prisma migrations, starts Next.js on another random loopback
port, and deletes the temporary database directory when the run ends.

The test process sets `OUTREACH_MAIL_TRANSPORT=simulated` and supplies invalid
local-only SMTP configuration. Campaign send and retry requests therefore use
the in-memory simulated transport. The suite never calls the SMTP diagnostic
or test-send endpoint. It does not read `.env` and cannot connect to the
deployed database or Tencent mailbox.

The wrapper requires PostgreSQL 16 command-line tools (`postgres`, `initdb`,
`pg_ctl`, and `createdb`) and the project Playwright browser:

```bash
yarn playwright install chromium
```

Use `yarn test:e2e:headed` for a visible local run. Failure traces,
screenshots, and videos are written under ignored `test-results` and
`playwright-report` directories.
