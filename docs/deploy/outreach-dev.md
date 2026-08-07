# outreach-dev Deployment

Rococo Outreach dev was fully migrated from `netcup1` to `netcup2` on
2026-08-02. The application, PostgreSQL database, GitHub access, restricted
deployment commands, Nginx ingress, TLS certificate renewal, and explicit DNS
record now operate from `netcup2`.

## Current location

- Root SSH alias: `rococo-root2`
- OpenClaw SSH alias: `rococo-oc-workplace2`
- Host project path: `/opt/docker/oc-projects/rococo-outreach`
- OpenClaw project path: `/work/oc-projects/rococo-outreach`
- PostgreSQL data: `/opt/persist/rococo-outreach/postgres`
- Ingress stack: `/opt/docker/rococo`
- Nginx vhost: `/opt/docker/rococo/data/nginx/conf.d/outreach-dev.rococo.dev.conf`
- ACME state: `/opt/docker/rococo/data/acme`
- Installed certificates: `/opt/docker/rococo/data/certs/rococo.dev`

The Git repository tracks:

```text
git@github.com-oc-workspace-write:oc-workspace/rococo-outreach.git
```

## Port

The app container exposes port `3000`; Compose maps host port `3107` to
container port `3000`.

The repository `.dockerignore` excludes `.env`, dependency directories, build
output, git metadata, logs, and coverage data from the Docker build context.
Do not remove the `.env` exclusions: the deployment environment contains SMTP
and database credentials that must never be copied into image build layers.
The Docker builder supplies a non-secret, unreachable placeholder
`DATABASE_URL` only while generating Prisma Client and compiling Next.js. Never
replace it with the runtime database URL or pass the real URL as a build arg.

## Maintenance commands

```bash
ssh rococo-oc-workplace2
cd /work/oc-projects/rococo-outreach

git pull
oc-deploy rococo-outreach deploy
oc-deploy rococo-outreach restart
oc-deploy rococo-outreach status
oc-deploy rococo-outreach logs
oc-deploy rococo-outreach config

oc-domain bind outreach-dev.rococo.dev rococo-outreach 3107
oc-domain status outreach-dev.rococo.dev

oc-push "Update description"
```

`oc-deploy` and `oc-domain` use restricted host accounts with forced commands.
The OpenClaw container has no `sudo` access and no Docker socket.

## Domain and TLS

Cloudflare has an explicit unproxied A record:

```text
outreach-dev.rococo.dev -> 152.53.54.88
TTL: 300 seconds
```

This explicit record overrides the existing `*.rococo.dev` wildcard without
changing other subdomains. HTTPS terminates on the `netcup2` Nginx container.
The wildcard `rococo.dev` certificate is renewed by the `acme` container, and
Nginx periodically reloads to pick up renewed certificates.

During migration, HTTP/API health checks, PostgreSQL table counts, GitHub push
dry-run, restricted deployment, domain binding, and SMTP TLS connections on
ports 465 and 587 were verified successfully from the target environment.

## SMTP test endpoint

The development-only SMTP diagnostic endpoint is disabled unless
`SMTP_TEST_API_TOKEN` is configured. Keep this token server-side and never put
it in browser code, source control, documentation, or command history.

Authenticated operations are:

```text
GET  /api/campaigns/send-test  configuration readiness only
PUT  /api/campaigns/send-test  verify SMTP connection and authentication; does not send
POST /api/campaigns/send-test  send one email to the configured controlled recipient
```

Send the token as `Authorization: Bearer <token>`. Responses mask mailbox
addresses and do not return provider response text. Verification and test sends
are rate limited in each application process. The default minimum intervals are
10 seconds for verification and 60 seconds for test sends; override them with
`SMTP_TEST_VERIFY_INTERVAL_SECONDS` and `SMTP_TEST_SEND_INTERVAL_SECONDS` only
when operationally necessary.

For Tencent enterprise mail, the current verified application configuration is
port 465 with implicit TLS (`TENCENT_MAIL_SMTP_SECURE=true`). Port 587 requires
`TENCENT_MAIL_SMTP_SECURE=false`; the transport then requires STARTTLS before
authentication. Do not implement automatic port failover during a send because
an ambiguous failure can otherwise produce a duplicate email.

## `netcup1` rollback retention

Migration does **not** automatically delete the old `netcup1` deployment. The
following rollback material is intentionally retained:

- Project source: `/opt/docker/oc-projects/rococo-outreach`
- PostgreSQL data: `/opt/persist/rococo-outreach/postgres`
- Final logical backup:
  `/opt/persist/rococo-outreach/migration-backups/rococo-outreach-db-final-20260802.dump`
- Stopped application and PostgreSQL containers
- The old Docker image
- Disabled Nginx configuration:
  `/opt/docker/rococo/data/nginx/conf.d/outreach-dev.rococo.dev.migrated-to-netcup2-20260802.disabled`
- Pre-migration Nginx configuration backups

The old application and database containers are stopped, and the old active
Nginx vhost has been removed from the enabled configuration set. Production
traffic no longer depends on `netcup1`.

Keep this rollback material for at least 7–14 days of stable operation. Delete
it only after explicit approval and a final backup/health check. Do not remove
shared `netcup1` services such as `oc-workplace`, Nginx, ACME, or the restricted
deployment accounts because other projects still use them.

## Security follow-up

Rotate the Cloudflare API token used by ACME, then update the ACME environment
on every server that still uses that token. Never place token values, mail
credentials, database passwords, or certificate private keys in this document.
