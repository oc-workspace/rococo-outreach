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
